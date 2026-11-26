# FIRST Studio Bridge

Local zero-dependency Java server (`JDK 17+`, uses WPILib's bundled `~/wpilib/2026/jdk`) that lets the FIRST Studio web editor sync files, run `./gradlew build` / `deploy` / `simulateJava`, and check roboRIO reachability from Chrome/Edge/Vercel.

## Build the JAR

Windows (PowerShell):
```powershell
.\bridge\build-bridge.ps1
```

macOS / Linux:
```bash
./bridge/build-bridge.sh
```

Output: `bridge/dist/first-studio-bridge.jar`

## Run on Driver Station / Dev Laptop

```bash
java -jar bridge/dist/first-studio-bridge.jar
```

Optional flags:
- `--folder "C:\Robots\my-robot"` — lock syncing and Gradle execution to an explicit folder (otherwise defaults to `~/FIRSTStudio/<projectName>`).
- `--port 47321` — override HTTP port (default `47321`).
- `--origin "https://your-custom-domain"` — allow an additional CORS origin besides `localhost`, `127.0.0.1`, and `*.vercel.app`.

On startup, the terminal displays a 6-character **Pair Code** (`Pair Code : XXXXXX`). Enter it once in **4. Export → Enviar ao Robô (Bridge)**.

## Hardware Release Checklist
Before releasing to teams, verify `gradlew deploy` and `GET /roborio?team=XXXX` against a physical roboRIO over:
1. **USB** (`172.22.11.2`)
2. **Wi-Fi / FMS** (`10.TE.AM.2` / `roborio-XXXX-frc.local`)
3. **Ethernet** (`roborio-XXXX-frc.local` / `10.TE.AM.2`)
