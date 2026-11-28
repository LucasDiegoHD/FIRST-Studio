import type { DrivetrainConfig, FieldZone, ZoneMirror } from "../../schema/ciprix-project";
import { formatDouble, isValidJavaIdentifier, toCamelCase, toUpperSnake } from "../java-utils";
import type { GeneratedFile } from "../subsystems/roller";

function escapeJavaString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
}

export function resolveZoneEnumNames(zones: FieldZone[]): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>(["NONE"]);
  for (const z of zones) {
    let base =
      isValidJavaIdentifier(z.name) && z.name !== "NONE"
        ? z.name
        : toUpperSnake(z.name || "ZONE");
    if (base === "NONE") base = "ZONE_1";
    let candidate = base;
    let idx = 2;
    while (used.has(candidate)) {
      candidate = `${base}_${idx}`;
      idx += 1;
    }
    used.add(candidate);
    map.set(z.id, candidate);
  }
  return map;
}

function flipFlags(mirror: ZoneMirror): { flipX: boolean; flipY: boolean } {
  return {
    flipX: mirror === "x" || mirror === "both",
    flipY: mirror === "y" || mirror === "both",
  };
}

function flipCoordExpr(axis: "X" | "Y", value: number, flip: boolean): string {
  const formatted = formatDouble(value);
  return flip ? `AllianceFlipUtil.flip${axis}(${formatted})` : formatted;
}

export function generateFieldZonesFile(
  zones: FieldZone[],
  basePackage: string,
  drivetrain?: DrivetrainConfig,
): GeneratedFile {
  const pkgPath = basePackage.replace(/\./g, "/");
  const fullPkg = `${basePackage}.field`;
  const enumById = resolveZoneEnumNames(zones);

  const hasRect = zones.some((z) => z.shape.kind === "rectangle");
  const hasCircle = zones.some((z) => z.shape.kind === "circle");
  const hasSuction = zones.some((z) => z.type === "suction");
  const hasMagnet = zones.some((z) => z.type === "magnet");
  const hasRepulsion = zones.some((z) => z.type === "repulsion" || z.type === "forbidden");
  const hasForbidden = zones.some((z) => z.type === "forbidden");
  const halfLenStr = formatDouble((drivetrain?.wheelBaseMeters ?? 0.56) / 2 + 0.08);
  const halfWidthStr = formatDouble((drivetrain?.trackWidthMeters ?? 0.56) / 2 + 0.08);

  const imports = [
    "import edu.wpi.first.math.geometry.Pose2d;",
    "import edu.wpi.first.math.geometry.Translation2d;",
    "import java.util.ArrayList;",
    "import java.util.EnumMap;",
    "import java.util.List;",
    "import java.util.Map;",
    "import org.ciprix.util.AllianceFlipUtil;",
    "import org.ciprix.util.drivetrain.DriveContext;",
    "import org.ciprix.util.drivetrain.TranslationModifier;",
    "import org.ciprix.zones.LogPolygon2d;",
    "import org.ciprix.zones.Polygon2d;",
    "import org.ciprix.zones.Zone2d;",
    "import org.ciprix.zones.ZoneIO;",
    "import org.littletonrobotics.junction.Logger;",
    ...(hasRect ? ["import org.ciprix.zones.Rectangle2d;"] : []),
    ...(hasCircle ? ["import org.ciprix.zones.Circle2d;"] : []),
    ...(hasSuction ? ["import org.ciprix.util.drivetrain.ZoneSuctionModifier;"] : []),
    ...(hasMagnet
      ? [
          "import edu.wpi.first.math.geometry.Rotation2d;",
          "import java.util.function.BooleanSupplier;",
        ]
      : []),
    ...(hasRepulsion ? ["import org.ciprix.util.drivetrain.ZoneRepulsionModifier;"] : []),
    ...(hasForbidden ? ["import org.ciprix.util.PersistentAlert;"] : []),
  ]
    .sort()
    .join("\n");

  const enumValues = ["NONE", ...zones.map((z) => enumById.get(z.id)!)].join(",\n    ");

  const alertFields: string[] = [];
  const initBlocks: string[] = [];
  const periodicAlertCalls: string[] = [];

  zones.forEach((zone, idx) => {
    const enumName = enumById.get(zone.id)!;
    const varBase = `${toCamelCase(enumName)}${idx}`;
    const { flipX, flipY } = flipFlags(zone.mirror);
    const hasMirror = flipX || flipY;

    let blueShapeLine = "";
    let redShapeLine = "";
    let bluePolyLine = "";
    let redPolyLine = "";

    if (zone.shape.kind === "rectangle") {
      const { x1, y1, x2, y2 } = zone.shape;
      blueShapeLine = `    Rectangle2d ${varBase}Blue = new Rectangle2d(new Translation2d(${formatDouble(x1)}, ${formatDouble(y1)}), new Translation2d(${formatDouble(x2)}, ${formatDouble(y2)}));`;
      bluePolyLine = `    Polygon2d ${varBase}BluePoly = rectangleToPolygon(${varBase}Blue);`;
      if (hasMirror) {
        redShapeLine = `    Rectangle2d ${varBase}Red = new Rectangle2d(new Translation2d(${flipCoordExpr("X", x1, flipX)}, ${flipCoordExpr("Y", y1, flipY)}), new Translation2d(${flipCoordExpr("X", x2, flipX)}, ${flipCoordExpr("Y", y2, flipY)}));`;
        redPolyLine = `    Polygon2d ${varBase}RedPoly = rectangleToPolygon(${varBase}Red);`;
      } else {
        redShapeLine = `    Rectangle2d ${varBase}Red = ${varBase}Blue;`;
        redPolyLine = `    Polygon2d ${varBase}RedPoly = ${varBase}BluePoly;`;
      }
    } else if (zone.shape.kind === "circle") {
      const { cx, cy, radius } = zone.shape;
      const rStr = formatDouble(radius);
      blueShapeLine = `    Circle2d ${varBase}Blue = new Circle2d(new Translation2d(${formatDouble(cx)}, ${formatDouble(cy)}), ${rStr});`;
      bluePolyLine = `    Polygon2d ${varBase}BluePoly = circleToPolygon(${varBase}Blue.getCenter(), ${rStr}, 16);`;
      if (hasMirror) {
        redShapeLine = `    Circle2d ${varBase}Red = new Circle2d(new Translation2d(${flipCoordExpr("X", cx, flipX)}, ${flipCoordExpr("Y", cy, flipY)}), ${rStr});`;
        redPolyLine = `    Polygon2d ${varBase}RedPoly = circleToPolygon(${varBase}Red.getCenter(), ${rStr}, 16);`;
      } else {
        redShapeLine = `    Circle2d ${varBase}Red = ${varBase}Blue;`;
        redPolyLine = `    Polygon2d ${varBase}RedPoly = ${varBase}BluePoly;`;
      }
    } else {
      const pts = zone.shape.vertices
        .map((v) => `new Translation2d(${formatDouble(v.x)}, ${formatDouble(v.y)})`)
        .join(", ");
      blueShapeLine = `    Polygon2d ${varBase}Blue = new Polygon2d(${pts});`;
      bluePolyLine = `    Polygon2d ${varBase}BluePoly = ${varBase}Blue;`;
      if (hasMirror) {
        redShapeLine = `    Polygon2d ${varBase}Red = AllianceFlipUtil.apply(${varBase}Blue, ${flipX}, ${flipY}, false);`;
        redPolyLine = `    Polygon2d ${varBase}RedPoly = ${varBase}Red;`;
      } else {
        redShapeLine = `    Polygon2d ${varBase}Red = ${varBase}Blue;`;
        redPolyLine = `    Polygon2d ${varBase}RedPoly = ${varBase}BluePoly;`;
      }
    }

    const lines: string[] = [
      blueShapeLine,
      bluePolyLine,
      redShapeLine,
      redPolyLine,
      `    blueZones.put(ZoneId.${enumName}, new Zone2d<>(ZoneId.${enumName}, ${varBase}Blue));`,
      `    redZones.put(ZoneId.${enumName}, new Zone2d<>(ZoneId.${enumName}, ${varBase}Red));`,
      `    bluePolygons.put(ZoneId.${enumName}, ${varBase}BluePoly);`,
      `    redPolygons.put(ZoneId.${enumName}, ${varBase}RedPoly);`,
    ];

    if (zone.type === "suction") {
      const strength = formatDouble(zone.strength ?? 0.4);
      lines.push(
        `    blueModifiers.add(new ZoneSuctionModifier(${varBase}BluePoly, ${strength}));`,
        `    redModifiers.add(new ZoneSuctionModifier(${varBase}RedPoly, ${strength}));`,
      );
    } else if (zone.type === "magnet") {
      const side = zone.magnetSide ?? "any";
      const rangeStr = formatDouble(zone.magnetRangeMeters ?? 0.45);
      const strength = formatDouble(zone.strength ?? 0.5);
      lines.push(
        `    blueModifiers.add((drive, in) -> applyBorderMagnet(drive, in, ${varBase}BluePoly, "${side}", ${rangeStr}, ${strength}, magnetGates.get(ZoneId.${enumName})));`,
        `    redModifiers.add((drive, in) -> applyBorderMagnet(drive, in, ${varBase}RedPoly, "${side}", ${rangeStr}, ${strength}, magnetGates.get(ZoneId.${enumName})));`,
      );
    } else if (zone.type === "repulsion" || zone.type === "forbidden") {
      const strength = formatDouble(zone.strength ?? (zone.type === "forbidden" ? 0.9 : 0.6));
      lines.push(
        `    blueModifiers.add(new ZoneRepulsionModifier(${varBase}BluePoly, ${strength}));`,
        `    redModifiers.add(new ZoneRepulsionModifier(${varBase}RedPoly, ${strength}));`,
      );
      if (zone.type === "forbidden") {
        const alertField = `${varBase}Alert`;
        const msg = zone.alertMessage?.trim() || `Robot entered forbidden zone ${enumName}`;
        alertFields.push(
          `  private final PersistentAlert ${alertField} =\n      new PersistentAlert("Zones", "${escapeJavaString(msg)}", PersistentAlert.Level.WARNING);`,
        );
        periodicAlertCalls.push(`    ${alertField}.set(inZone(ZoneId.${enumName}, pose));`);
      }
    } else if (zone.type === "speedLimit") {
      const factor = formatDouble(zone.speedFactor ?? 0.5);
      const speedMod = `(drive, in) -> inZone(ZoneId.${enumName}, drive.getPose()) ? in.times(${factor}) : in`;
      lines.push(
        `    blueModifiers.add(${speedMod});`,
        `    redModifiers.add(${speedMod});`,
      );
    }

    initBlocks.push(lines.join("\n"));
  });

  const helperMethods: string[] = [];
  if (hasRect) {
    helperMethods.push(`  private static Polygon2d rectangleToPolygon(Rectangle2d rect) {
    return new Polygon2d(
        rect.getBottomLeft(),
        rect.getBottomRight(),
        rect.getTopRight(),
        rect.getTopLeft());
  }`);
  }
  if (hasCircle) {
    helperMethods.push(`  private static Polygon2d circleToPolygon(
      Translation2d center, double radius, int segments) {
    Translation2d[] vertices = new Translation2d[segments];
    for (int i = 0; i < segments; i++) {
      double angle = (2.0 * Math.PI * i) / segments;
      vertices[i] =
          new Translation2d(
              center.getX() + radius * Math.cos(angle),
              center.getY() + radius * Math.sin(angle));
    }
    return new Polygon2d(vertices);
  }`);
  }

  if (hasMagnet) {
    helperMethods.push(`  private static final double ROBOT_HALF_LENGTH_M = ${halfLenStr};
  private static final double ROBOT_HALF_WIDTH_M = ${halfWidthStr};

  private static Translation2d applyBorderMagnet(
      DriveContext drive,
      Translation2d input,
      Polygon2d zonePoly,
      String side,
      double rangeMeters,
      double strength,
      BooleanSupplier gate) {
    if (gate != null && !gate.getAsBoolean()) {
      return input;
    }
    Pose2d pose = drive.getPose();
    Translation2d center = pose.getTranslation();
    Rotation2d rot = pose.getRotation();
    Translation2d[] localPts =
        switch (side) {
          case "front" -> new Translation2d[] {
            new Translation2d(ROBOT_HALF_LENGTH_M, 0.0),
            new Translation2d(ROBOT_HALF_LENGTH_M, ROBOT_HALF_WIDTH_M),
            new Translation2d(ROBOT_HALF_LENGTH_M, -ROBOT_HALF_WIDTH_M)
          };
          case "back" -> new Translation2d[] {
            new Translation2d(-ROBOT_HALF_LENGTH_M, 0.0),
            new Translation2d(-ROBOT_HALF_LENGTH_M, ROBOT_HALF_WIDTH_M),
            new Translation2d(-ROBOT_HALF_LENGTH_M, -ROBOT_HALF_WIDTH_M)
          };
          case "left" -> new Translation2d[] {
            new Translation2d(0.0, ROBOT_HALF_WIDTH_M),
            new Translation2d(ROBOT_HALF_LENGTH_M, ROBOT_HALF_WIDTH_M),
            new Translation2d(-ROBOT_HALF_LENGTH_M, ROBOT_HALF_WIDTH_M)
          };
          case "right" -> new Translation2d[] {
            new Translation2d(0.0, -ROBOT_HALF_WIDTH_M),
            new Translation2d(ROBOT_HALF_LENGTH_M, -ROBOT_HALF_WIDTH_M),
            new Translation2d(-ROBOT_HALF_LENGTH_M, -ROBOT_HALF_WIDTH_M)
          };
          default -> new Translation2d[] {
            new Translation2d(ROBOT_HALF_LENGTH_M, 0.0),
            new Translation2d(-ROBOT_HALF_LENGTH_M, 0.0),
            new Translation2d(0.0, ROBOT_HALF_WIDTH_M),
            new Translation2d(0.0, -ROBOT_HALF_WIDTH_M),
            new Translation2d(ROBOT_HALF_LENGTH_M, ROBOT_HALF_WIDTH_M),
            new Translation2d(ROBOT_HALF_LENGTH_M, -ROBOT_HALF_WIDTH_M),
            new Translation2d(-ROBOT_HALF_LENGTH_M, ROBOT_HALF_WIDTH_M),
            new Translation2d(-ROBOT_HALF_LENGTH_M, -ROBOT_HALF_WIDTH_M)
          };
        };

    double bestGap = Double.POSITIVE_INFINITY;
    Translation2d bestDelta = null;
    for (Translation2d local : localPts) {
      Translation2d borderField = center.plus(local.rotateBy(rot));
      if (zonePoly.contains(borderField)) {
        return input;
      }
      Translation2d closest = zonePoly.getClosestPoint(borderField);
      double gap = borderField.getDistance(closest);
      if (gap < bestGap) {
        bestGap = gap;
        bestDelta = closest.minus(borderField);
      }
    }

    if (bestDelta == null || bestGap <= 0.015 || bestGap > rangeMeters) {
      return input;
    }

    Translation2d dirDriver = TranslationModifier.fieldToDriver(bestDelta.div(bestGap));
    // Release magnet when driver pushes firmly in the opposite direction.
    if (input.getX() * dirDriver.getX() + input.getY() * dirDriver.getY() < -0.35) {
      return input;
    }

    double pullMag = strength * (1.0 - 0.65 * (bestGap / rangeMeters));
    Translation2d out = input.plus(dirDriver.times(pullMag));
    return out.getNorm() > 1.0 ? out.div(out.getNorm()) : out;
  }`);
  }

  const magnetField = hasMagnet
    ? "\n  private final Map<ZoneId, BooleanSupplier> magnetGates = new EnumMap<>(ZoneId.class);"
    : "";
  const magnetSetter = hasMagnet
    ? `\n  public void setMagnetGate(ZoneId id, BooleanSupplier gate) {\n    if (id != null && id != ZoneId.NONE && gate != null) {\n      magnetGates.put(id, gate);\n    }\n  }\n`
    : "";

  const content = `package ${fullPkg};

${imports}

/** Field zones, alliance mirroring, drive modifiers, and AdvantageKit logging. */
public class FieldZones {
  public enum ZoneId {
    ${enumValues}
  }

  private final Map<ZoneId, Zone2d<ZoneId>> blueZones = new EnumMap<>(ZoneId.class);
  private final Map<ZoneId, Zone2d<ZoneId>> redZones = new EnumMap<>(ZoneId.class);
  private final Map<ZoneId, Polygon2d> bluePolygons = new EnumMap<>(ZoneId.class);
  private final Map<ZoneId, Polygon2d> redPolygons = new EnumMap<>(ZoneId.class);
  private final List<TranslationModifier> blueModifiers = new ArrayList<>();
  private final List<TranslationModifier> redModifiers = new ArrayList<>();${magnetField}
${alertFields.length > 0 ? alertFields.join("\n") + "\n" : ""}
  public FieldZones() {
${initBlocks.join("\n\n")}
  }
${magnetSetter}

  public Zone2d<ZoneId> getZone(ZoneId id) {
    if (id == null || id == ZoneId.NONE) return null;
    return AllianceFlipUtil.shouldFlip() ? redZones.get(id) : blueZones.get(id);
  }

  public boolean contains(ZoneId id, Pose2d pose) {
    if (id == null || id == ZoneId.NONE || pose == null) return false;
    Zone2d<ZoneId> zone = getZone(id);
    return zone != null && zone.contains(pose.getTranslation());
  }

  public boolean inZone(ZoneId id, Pose2d pose) {
    return contains(id, pose);
  }

  public ZoneId current(Pose2d pose) {
    if (pose == null) return ZoneId.NONE;
    Translation2d point = pose.getTranslation();
    Map<ZoneId, Zone2d<ZoneId>> map = AllianceFlipUtil.shouldFlip() ? redZones : blueZones;
    for (Zone2d<ZoneId> zone : map.values()) {
      if (zone.contains(point)) {
        return zone.getId();
      }
    }
    return ZoneId.NONE;
  }

  public List<ZoneId> activeZones(Pose2d pose) {
    List<ZoneId> active = new ArrayList<>();
    if (pose == null) return active;
    Translation2d point = pose.getTranslation();
    Map<ZoneId, Zone2d<ZoneId>> map = AllianceFlipUtil.shouldFlip() ? redZones : blueZones;
    for (Zone2d<ZoneId> zone : map.values()) {
      if (zone.contains(point)) {
        active.add(zone.getId());
      }
    }
    return active;
  }

  public Translation2d applyDriveModifiers(DriveContext drive, Translation2d input) {
    Translation2d out = input;
    List<TranslationModifier> mods =
        AllianceFlipUtil.shouldFlip() ? redModifiers : blueModifiers;
    for (TranslationModifier mod : mods) {
      out = mod.apply(drive, out);
    }
    return out;
  }

  public void periodic(Pose2d pose) {
    Logger.recordOutput("Zones/Current", current(pose).name());
    List<ZoneId> active = activeZones(pose);
    String[] activeNames = new String[active.size()];
    for (int i = 0; i < active.size(); i++) {
      activeNames[i] = active.get(i).name();
    }
    Logger.recordOutput("Zones/Active", activeNames);
    Map<ZoneId, Polygon2d> polys = AllianceFlipUtil.shouldFlip() ? redPolygons : bluePolygons;
    for (Map.Entry<ZoneId, Polygon2d> entry : polys.entrySet()) {
      LogPolygon2d.logPolygon(entry.getKey().name(), entry.getValue());
    }
${periodicAlertCalls.length > 0 ? periodicAlertCalls.join("\n") + "\n" : ""}  }
${helperMethods.length > 0 ? "\n" + helperMethods.join("\n\n") + "\n" : ""}}
`;

  return {
    path: `src/main/java/${pkgPath}/field/FieldZones.java`,
    content,
  };
}
