package org.firststudio.bridge;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;

/**
 * FIRST Studio local Bridge server (zero dependencies, JDK 17+).
 * Binds strictly to 127.0.0.1 and coordinates local sync, roboRIO discovery, and Gradle tasks.
 */
public final class FirstStudioBridge {
  private static final String VERSION = "0.1.0";
  private static final int DEFAULT_PORT = 47321;
  private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  private final Path configuredFolder;
  private final Path defaultWorkspaceRoot;
  private final String customOrigin;
  private final String pairingCode;
  private final Map<String, Boolean> validTokens = new ConcurrentHashMap<>();
  private final Map<String, GradleJob> jobs = new ConcurrentHashMap<>();
  private final AtomicReference<String> activeJobId = new AtomicReference<>(null);
  private final AtomicReference<Path> lastSyncedFolder = new AtomicReference<>(null);
  private final ExecutorService executor = Executors.newCachedThreadPool();

  private static final class GradleJob {
    final String id;
    final String task;
    final List<String> lines = new CopyOnWriteArrayList<>();
    volatile boolean done = false;
    volatile int exitCode = -1;

    GradleJob(String id, String task) {
      this.id = id;
      this.task = task;
    }
  }

  public FirstStudioBridge(Path configuredFolder, String customOrigin) {
    this.configuredFolder = configuredFolder;
    this.defaultWorkspaceRoot =
        Paths.get(System.getProperty("user.home"), "FIRSTStudio").toAbsolutePath().normalize();
    this.customOrigin = customOrigin;
    this.pairingCode = generatePairingCode();
  }

  public static void main(String[] args) throws Exception {
    int port = DEFAULT_PORT;
    Path folder = null;
    String origin = null;

    for (int i = 0; i < args.length; i++) {
      switch (args[i]) {
        case "--port":
          if (i + 1 < args.length) port = Integer.parseInt(args[++i]);
          break;
        case "--folder":
          if (i + 1 < args.length) folder = Paths.get(args[++i]).toAbsolutePath().normalize();
          break;
        case "--origin":
          if (i + 1 < args.length) origin = args[++i];
          break;
        default:
          break;
      }
    }

    FirstStudioBridge bridge = new FirstStudioBridge(folder, origin);
    bridge.start(port);
  }

  private void start(int port) throws IOException {
    InetAddress loopback = InetAddress.getByName("127.0.0.1");
    HttpServer server = HttpServer.create(new InetSocketAddress(loopback, port), 0);
    server.setExecutor(executor);

    server.createContext("/health", this::handleHealth);
    server.createContext("/pair", this::handlePair);
    server.createContext("/roborio", this::handleRoboRio);
    server.createContext("/sync", this::handleSync);
    server.createContext("/run", this::handleRun);
    server.createContext("/jobs", this::handleJobStream);

    server.start();

    System.out.println("====================================================");
    System.out.println("  FIRST Studio Bridge v" + VERSION);
    System.out.println("  Listening : http://127.0.0.1:" + port);
    System.out.println("  Folder    : " + (configuredFolder != null ? configuredFolder : defaultWorkspaceRoot + " (auto per project)"));
    System.out.println("  JDK       : " + resolveWpilibJdkHome());
    System.out.println("  Pair Code : " + pairingCode);
    System.out.println("====================================================");
  }

  private static String generatePairingCode() {
    SecureRandom rng = new SecureRandom();
    StringBuilder sb = new StringBuilder(6);
    for (int i = 0; i < 6; i++) {
      sb.append(CODE_ALPHABET.charAt(rng.nextInt(CODE_ALPHABET.length())));
    }
    return sb.toString();
  }

  private boolean applyCorsAndPreflight(HttpExchange exchange) throws IOException {
    Headers reqHeaders = exchange.getRequestHeaders();
    Headers resHeaders = exchange.getResponseHeaders();
    String origin = reqHeaders.getFirst("Origin");

    if (origin != null && !origin.isBlank()) {
      if (!isAllowedOrigin(origin)) {
        sendJson(exchange, 403, "{\"error\":\"Origin not allowed\"}");
        return false;
      }
      resHeaders.set("Access-Control-Allow-Origin", origin);
      resHeaders.set("Vary", "Origin");
    }

    resHeaders.set("Access-Control-Allow-Private-Network", "true");
    resHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token");

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
      exchange.sendResponseHeaders(204, -1);
      exchange.close();
      return false;
    }
    return true;
  }

  private boolean isAllowedOrigin(String origin) {
    if (customOrigin != null && customOrigin.equalsIgnoreCase(origin)) {
      return true;
    }
    try {
      URI uri = URI.create(origin);
      String host = uri.getHost();
      if (host == null) return false;
      String lower = host.toLowerCase();
      return lower.equals("localhost")
          || lower.equals("127.0.0.1")
          || lower.endsWith(".vercel.app");
    } catch (IllegalArgumentException e) {
      return false;
    }
  }

  private boolean isAuthorized(HttpExchange exchange) {
    String headerToken = exchange.getRequestHeaders().getFirst("X-Bridge-Token");
    if (headerToken != null && validTokens.containsKey(headerToken)) {
      return true;
    }
    String query = exchange.getRequestURI().getRawQuery();
    if (query != null) {
      for (String pair : query.split("&")) {
        int eq = pair.indexOf('=');
        if (eq > 0 && "token".equals(pair.substring(0, eq))) {
          String tok = pair.substring(eq + 1);
          if (validTokens.containsKey(tok)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private void handleHealth(HttpExchange exchange) throws IOException {
    if (!applyCorsAndPreflight(exchange)) return;
    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
      sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
      return;
    }
    Path folder = resolveActiveFolder(null);
    String json =
        "{"
            + "\"ok\":true,"
            + "\"version\":" + jsonString(VERSION) + ","
            + "\"folder\":" + (folder != null ? jsonString(folder.toString()) : "null") + ","
            + "\"jdkVersion\":" + jsonString(System.getProperty("java.version")) + ","
            + "\"activeJob\":" + (activeJobId.get() != null ? jsonString(activeJobId.get()) : "null")
            + "}";
    sendJson(exchange, 200, json);
  }

  private void handlePair(HttpExchange exchange) throws IOException {
    if (!applyCorsAndPreflight(exchange)) return;
    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
      sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
      return;
    }
    String body = readRequestBody(exchange);
    Map<String, Object> payload = asObject(JsonParser.parse(body));
    String supplied = payload != null && payload.get("code") instanceof String s ? s.trim().toUpperCase() : "";

    byte[] a = pairingCode.getBytes(StandardCharsets.UTF_8);
    byte[] b = supplied.getBytes(StandardCharsets.UTF_8);
    if (!MessageDigest.isEqual(a, b)) {
      sendJson(exchange, 401, "{\"error\":\"Invalid pairing code\"}");
      return;
    }

    String token = UUID.randomUUID().toString();
    validTokens.put(token, Boolean.TRUE);
    sendJson(exchange, 200, "{\"token\":" + jsonString(token) + "}");
  }

  private void handleRoboRio(HttpExchange exchange) throws IOException {
    if (!applyCorsAndPreflight(exchange)) return;
    if (!isAuthorized(exchange)) {
      sendJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
      return;
    }
    int team = 0;
    String query = exchange.getRequestURI().getRawQuery();
    if (query != null) {
      for (String pair : query.split("&")) {
        int eq = pair.indexOf('=');
        if (eq > 0 && "team".equals(pair.substring(0, eq))) {
          try {
            team = Integer.parseInt(pair.substring(eq + 1));
          } catch (NumberFormatException ignored) {
            team = 0;
          }
        }
      }
    }

    List<String[]> candidates = new ArrayList<>();
    candidates.add(new String[] {"172.22.11.2", "usb"});
    if (team > 0) {
      int hi = team / 100;
      int lo = team % 100;
      candidates.add(new String[] {"10." + hi + "." + lo + ".2", "ethernet"});
      candidates.add(new String[] {"roborio-" + team + "-frc.local", "mdns"});
    }

    String foundAddr = null;
    String foundMode = "none";
    List<String> checked = new ArrayList<>();

    for (String[] item : candidates) {
      checked.add(item[0]);
      try {
        InetAddress addr = InetAddress.getByName(item[0]);
        if (addr.isReachable(700)) {
          foundAddr = item[0];
          foundMode = item[1];
          break;
        }
      } catch (IOException ignored) {
        // Continue probing next candidate
      }
    }

    StringBuilder checkedJson = new StringBuilder("[");
    for (int i = 0; i < checked.size(); i++) {
      if (i > 0) checkedJson.append(',');
      checkedJson.append(jsonString(checked.get(i)));
    }
    checkedJson.append(']');

    String json =
        "{"
            + "\"reachable\":" + (foundAddr != null) + ","
            + "\"address\":" + (foundAddr != null ? jsonString(foundAddr) : "null") + ","
            + "\"mode\":" + jsonString(foundMode) + ","
            + "\"checked\":" + checkedJson
            + "}";
    sendJson(exchange, 200, json);
  }

  private void handleSync(HttpExchange exchange) throws IOException {
    if (!applyCorsAndPreflight(exchange)) return;
    if (!isAuthorized(exchange)) {
      sendJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
      return;
    }
    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
      sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
      return;
    }

    String body = readRequestBody(exchange);
    Map<String, Object> payload = asObject(JsonParser.parse(body));
    if (payload == null) {
      sendJson(exchange, 400, "{\"error\":\"Invalid JSON body\"}");
      return;
    }

    String projectName = payload.get("projectName") instanceof String s ? s : "robot";
    Path targetDir = resolveTargetFolderForSync(projectName);
    Files.createDirectories(targetDir);

    Object rawFiles = payload.get("files");
    if (!(rawFiles instanceof List<?> fileList)) {
      sendJson(exchange, 400, "{\"error\":\"Missing files array\"}");
      return;
    }

    int written = 0;
    for (Object item : fileList) {
      Map<String, Object> entry = asObject(item);
      if (entry == null) continue;
      String relPath = entry.get("path") instanceof String p ? p : null;
      String content = entry.get("content") instanceof String c ? c : null;
      String encoding = entry.get("encoding") instanceof String e ? e : "utf8";
      if (relPath == null || content == null) continue;

      Path rel = Paths.get(relPath);
      if (rel.isAbsolute()) {
        sendJson(exchange, 400, "{\"error\":\"Absolute path not allowed\"}");
        return;
      }
      Path dest = targetDir.resolve(rel).normalize();
      if (!dest.startsWith(targetDir)) {
        sendJson(exchange, 400, "{\"error\":\"Path traversal rejected\"}");
        return;
      }

      if (dest.getParent() != null) {
        Files.createDirectories(dest.getParent());
      }
      byte[] bytes =
          "base64".equalsIgnoreCase(encoding)
              ? Base64.getDecoder().decode(content)
              : content.getBytes(StandardCharsets.UTF_8);
      Files.write(dest, bytes);
      written++;
    }

    lastSyncedFolder.set(targetDir);
    String json =
        "{\"ok\":true,\"written\":" + written + ",\"folder\":" + jsonString(targetDir.toString()) + "}";
    sendJson(exchange, 200, json);
  }

  private void handleRun(HttpExchange exchange) throws IOException {
    if (!applyCorsAndPreflight(exchange)) return;
    if (!isAuthorized(exchange)) {
      sendJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
      return;
    }
    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
      sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
      return;
    }

    String body = readRequestBody(exchange);
    Map<String, Object> payload = asObject(JsonParser.parse(body));
    String task = payload != null && payload.get("task") instanceof String s ? s : "";
    if (!"build".equals(task) && !"deploy".equals(task) && !"simulateJava".equals(task)) {
      sendJson(exchange, 400, "{\"error\":\"Unsupported Gradle task\"}");
      return;
    }

    String projectName = payload != null && payload.get("projectName") instanceof String s ? s : null;
    Path projectDir = resolveActiveFolder(projectName);
    if (projectDir == null || !Files.exists(projectDir.resolve("build.gradle"))) {
      sendJson(exchange, 400, "{\"error\":\"Project folder missing build.gradle; sync first\"}");
      return;
    }

    String jobId = UUID.randomUUID().toString();
    GradleJob job = new GradleJob(jobId, task);
    jobs.put(jobId, job);
    activeJobId.set(jobId);

    executor.submit(() -> runGradleProcess(job, projectDir));
    sendJson(exchange, 200, "{\"jobId\":" + jsonString(jobId) + "}");
  }

  private void runGradleProcess(GradleJob job, Path projectDir) {
    try {
      boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");
      Path wrapper = projectDir.resolve(isWindows ? "gradlew.bat" : "gradlew");
      if (!Files.exists(wrapper)) {
        job.lines.add("ERROR: gradlew not found in " + projectDir);
        job.exitCode = 1;
        job.done = true;
        return;
      }

      if (!isWindows) {
        wrapper.toFile().setExecutable(true);
      }

      List<String> cmd = new ArrayList<>();
      if (isWindows) {
        cmd.add("cmd.exe");
        cmd.add("/c");
        cmd.add(wrapper.toAbsolutePath().toString());
      } else {
        cmd.add(wrapper.toAbsolutePath().toString());
      }
      cmd.add(job.task);
      cmd.add("--no-daemon");

      ProcessBuilder pb = new ProcessBuilder(cmd);
      pb.directory(projectDir.toFile());
      pb.redirectErrorStream(true);

      String jdkHome = resolveWpilibJdkHome();
      if (jdkHome != null) {
        pb.environment().put("JAVA_HOME", jdkHome);
      }

      job.lines.add("> " + String.join(" ", cmd));
      Process proc = pb.start();
      try (BufferedReader reader =
          new BufferedReader(new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
        String line;
        while ((line = reader.readLine()) != null) {
          job.lines.add(line);
        }
      }
      job.exitCode = proc.waitFor();
    } catch (Exception e) {
      job.lines.add("ERROR: " + e.getMessage());
      job.exitCode = 1;
    } finally {
      job.done = true;
      activeJobId.compareAndSet(job.id, null);
    }
  }

  private void handleJobStream(HttpExchange exchange) throws IOException {
    if (!applyCorsAndPreflight(exchange)) return;
    if (!isAuthorized(exchange)) {
      sendJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
      return;
    }

    String path = exchange.getRequestURI().getPath();
    // Expect /jobs/<id>/stream
    String[] parts = path.split("/");
    if (parts.length < 4) {
      sendJson(exchange, 400, "{\"error\":\"Invalid job stream path\"}");
      return;
    }
    String jobId = parts[2];
    GradleJob job = jobs.get(jobId);
    if (job == null) {
      sendJson(exchange, 404, "{\"error\":\"Job not found\"}");
      return;
    }

    Headers res = exchange.getResponseHeaders();
    res.set("Content-Type", "text/event-stream; charset=utf-8");
    res.set("Cache-Control", "no-cache");
    exchange.sendResponseHeaders(200, 0);

    try (OutputStream out = exchange.getResponseBody()) {
      int sent = 0;
      while (true) {
        List<String> snapshot = job.lines;
        while (sent < snapshot.size()) {
          String line = snapshot.get(sent++);
          String payload = "event: log\ndata: " + jsonString(line) + "\n\n";
          out.write(payload.getBytes(StandardCharsets.UTF_8));
          out.flush();
        }
        if (job.done && sent >= job.lines.size()) {
          String donePayload =
              "event: done\ndata: {\"exitCode\":" + job.exitCode + "}\n\n";
          out.write(donePayload.getBytes(StandardCharsets.UTF_8));
          out.flush();
          break;
        }
        try {
          Thread.sleep(60);
        } catch (InterruptedException ignored) {
          Thread.currentThread().interrupt();
          break;
        }
      }
    }
  }

  private Path resolveTargetFolderForSync(String projectName) {
    if (configuredFolder != null) return configuredFolder;
    String safe = projectName.replaceAll("[^A-Za-z0-9_-]", "-");
    if (safe.isBlank()) safe = "robot";
    return defaultWorkspaceRoot.resolve(safe).normalize();
  }

  private Path resolveActiveFolder(String projectName) {
    if (configuredFolder != null) return configuredFolder;
    if (lastSyncedFolder.get() != null) return lastSyncedFolder.get();
    if (projectName != null && !projectName.isBlank()) {
      return resolveTargetFolderForSync(projectName);
    }
    return defaultWorkspaceRoot;
  }

  private static String resolveWpilibJdkHome() {
    List<Path> candidates = new ArrayList<>();
    candidates.add(Paths.get(System.getProperty("user.home"), "wpilib", "2026", "jdk"));
    String publicDir = System.getenv("PUBLIC");
    if (publicDir != null) {
      candidates.add(Paths.get(publicDir, "wpilib", "2026", "jdk"));
    }
    candidates.add(Paths.get("C:\\Users\\Public\\wpilib\\2026\\jdk"));
    for (Path c : candidates) {
      if (Files.isDirectory(c)) return c.toAbsolutePath().toString();
    }
    return System.getProperty("java.home");
  }

  private static String readRequestBody(HttpExchange exchange) throws IOException {
    return new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
  }

  private static void sendJson(HttpExchange exchange, int status, String json) throws IOException {
    byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
    exchange.sendResponseHeaders(status, bytes.length);
    try (OutputStream out = exchange.getResponseBody()) {
      out.write(bytes);
    }
  }

  private static String jsonString(String value) {
    if (value == null) return "null";
    StringBuilder sb = new StringBuilder(value.length() + 4);
    sb.append('"');
    for (int i = 0; i < value.length(); i++) {
      char ch = value.charAt(i);
      switch (ch) {
        case '"':
          sb.append("\\\"");
          break;
        case '\\':
          sb.append("\\\\");
          break;
        case '\b':
          sb.append("\\b");
          break;
        case '\f':
          sb.append("\\f");
          break;
        case '\n':
          sb.append("\\n");
          break;
        case '\r':
          sb.append("\\r");
          break;
        case '\t':
          sb.append("\\t");
          break;
        default:
          if (ch < 0x20) {
            sb.append(String.format("\\u%04x", (int) ch));
          } else {
            sb.append(ch);
          }
      }
    }
    sb.append('"');
    return sb.toString();
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> asObject(Object parsed) {
    return parsed instanceof Map<?, ?> m ? (Map<String, Object>) m : null;
  }

  /** Minimal zero-dependency recursive-descent JSON parser. */
  private static final class JsonParser {
    private final String input;
    private int pos = 0;

    private JsonParser(String input) {
      this.input = input == null ? "" : input;
    }

    static Object parse(String text) {
      try {
        JsonParser p = new JsonParser(text);
        p.skipWs();
        if (p.pos >= p.input.length()) return null;
        return p.readValue();
      } catch (RuntimeException e) {
        return null;
      }
    }

    private Object readValue() {
      skipWs();
      if (pos >= input.length()) return null;
      char c = input.charAt(pos);
      if (c == '{') return readObject();
      if (c == '[') return readArray();
      if (c == '"') return readString();
      if (c == 't' && input.startsWith("true", pos)) {
        pos += 4;
        return Boolean.TRUE;
      }
      if (c == 'f' && input.startsWith("false", pos)) {
        pos += 5;
        return Boolean.FALSE;
      }
      if (c == 'n' && input.startsWith("null", pos)) {
        pos += 4;
        return null;
      }
      return readNumber();
    }

    private Map<String, Object> readObject() {
      Map<String, Object> map = new LinkedHashMap<>();
      pos++; // '{'
      skipWs();
      if (peek() == '}') {
        pos++;
        return map;
      }
      while (pos < input.length()) {
        skipWs();
        String key = readString();
        skipWs();
        if (peek() == ':') pos++;
        Object val = readValue();
        map.put(key, val);
        skipWs();
        char next = peek();
        if (next == ',') {
          pos++;
        } else if (next == '}') {
          pos++;
          return map;
        } else {
          break;
        }
      }
      return map;
    }

    private List<Object> readArray() {
      List<Object> list = new ArrayList<>();
      pos++; // '['
      skipWs();
      if (peek() == ']') {
        pos++;
        return list;
      }
      while (pos < input.length()) {
        list.add(readValue());
        skipWs();
        char next = peek();
        if (next == ',') {
          pos++;
        } else if (next == ']') {
          pos++;
          return list;
        } else {
          break;
        }
      }
      return list;
    }

    private String readString() {
      if (peek() == '"') pos++;
      StringBuilder sb = new StringBuilder();
      while (pos < input.length()) {
        char c = input.charAt(pos++);
        if (c == '"') return sb.toString();
        if (c == '\\' && pos < input.length()) {
          char esc = input.charAt(pos++);
          switch (esc) {
            case '"':
            case '\\':
            case '/':
              sb.append(esc);
              break;
            case 'b':
              sb.append('\b');
              break;
            case 'f':
              sb.append('\f');
              break;
            case 'n':
              sb.append('\n');
              break;
            case 'r':
              sb.append('\r');
              break;
            case 't':
              sb.append('\t');
              break;
            case 'u':
              if (pos + 4 <= input.length()) {
                sb.append((char) Integer.parseInt(input.substring(pos, pos + 4), 16));
                pos += 4;
              }
              break;
            default:
              sb.append(esc);
          }
        } else {
          sb.append(c);
        }
      }
      return sb.toString();
    }

    private Number readNumber() {
      int start = pos;
      while (pos < input.length()) {
        char c = input.charAt(pos);
        if ((c >= '0' && c <= '9') || c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E') {
          pos++;
        } else {
          break;
        }
      }
      String raw = input.substring(start, pos);
      if (raw.contains(".") || raw.contains("e") || raw.contains("E")) {
        return Double.parseDouble(raw);
      }
      return Long.parseLong(raw);
    }

    private void skipWs() {
      while (pos < input.length() && Character.isWhitespace(input.charAt(pos))) {
        pos++;
      }
    }

    private char peek() {
      return pos < input.length() ? input.charAt(pos) : '\0';
    }
  }

  static {
    // Keep unused import clean if Collections needed later
    Collections.emptyList();
  }
}
