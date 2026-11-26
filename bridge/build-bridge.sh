#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/out"
DIST_DIR="$SCRIPT_DIR/dist"
JAR_PATH="$DIST_DIR/first-studio-bridge.jar"

WPILIB_JDK="$HOME/wpilib/2026/jdk/bin"
if [ -x "$WPILIB_JDK/javac" ]; then
  JAVAC="$WPILIB_JDK/javac"
  JAR="$WPILIB_JDK/jar"
else
  JAVAC="$(command -v javac)"
  JAR="$(command -v jar)"
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR" "$DIST_DIR"

"$JAVAC" --release 17 -d "$OUT_DIR" "$SCRIPT_DIR/src/org/firststudio/bridge/FirstStudioBridge.java"
"$JAR" --create --file "$JAR_PATH" --main-class org.firststudio.bridge.FirstStudioBridge -C "$OUT_DIR" .

echo "Built $JAR_PATH successfully."
