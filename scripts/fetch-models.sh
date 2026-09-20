#!/usr/bin/env bash
# Holt die MediaPipe-Modelle/WASM-Dateien fuer die clientseitige Analyse
# (ADR-0004, umgesetzt in Slice 6). Nicht ins Repo committed - 43 MB
# Binaerdateien sind der falsche Ort dafuer, reproduzierbar per Skript ist
# sauberer. Einmalig nach "npm install" im frontend/-Ordner ausfuehren,
# bevor "npm run dev"/"build"/"preview" die Kamera-Analyse braucht.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
FRONTEND_DIR="$REPO_ROOT/frontend"
MODELS_DIR="$FRONTEND_DIR/public/models"
NODE_MODULES_WASM="$FRONTEND_DIR/node_modules/@mediapipe/tasks-vision/wasm"

FACE_MODEL_URL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
FACE_MODEL_SHA256="64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff"

POSE_MODEL_URL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
POSE_MODEL_SHA256="59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a"

# macOS hat shasum, kein sha256sum; die meisten Linux-Distributionen haben
# sha256sum (coreutils), aber nicht zwingend shasum - deshalb beides probieren.
compute_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    echo "FEHLER: weder sha256sum noch shasum gefunden." >&2
    exit 1
  fi
}

download_and_verify() {
  local url="$1" dest="$2" expected_sha256="$3"
  echo "Lade $(basename "$dest") ..."
  curl -fsSL -o "$dest" "$url"

  local actual_sha256
  actual_sha256="$(compute_sha256 "$dest")"
  if [ "$actual_sha256" != "$expected_sha256" ]; then
    echo "FEHLER: Pruefsumme von $(basename "$dest") stimmt nicht." >&2
    echo "  erwartet: $expected_sha256" >&2
    echo "  erhalten: $actual_sha256" >&2
    rm -f "$dest"
    exit 1
  fi
}

if [ ! -d "$NODE_MODULES_WASM" ]; then
  echo "FEHLER: $NODE_MODULES_WASM nicht gefunden - erst 'npm install' im frontend/-Ordner ausfuehren." >&2
  exit 1
fi

mkdir -p "$MODELS_DIR/wasm"

download_and_verify "$FACE_MODEL_URL" "$MODELS_DIR/face_landmarker.task" "$FACE_MODEL_SHA256"
download_and_verify "$POSE_MODEL_URL" "$MODELS_DIR/pose_landmarker_lite.task" "$POSE_MODEL_SHA256"

# Nur simd + nosimd, nicht die "module"-Variante (pthread/Multithreading):
# analysis.worker.ts ruft FilesetResolver.forVisionTasks() ohne Threading-Flag
# auf, die "module"-Dateien wuerden also nie angefragt - Kopieren spart ~11,7 MB
# ohne jeden Funktionsverlust.
echo "Kopiere WASM-Fileset (simd + nosimd) ..."
cp "$NODE_MODULES_WASM/vision_wasm_internal.js" "$MODELS_DIR/wasm/"
cp "$NODE_MODULES_WASM/vision_wasm_internal.wasm" "$MODELS_DIR/wasm/"
cp "$NODE_MODULES_WASM/vision_wasm_nosimd_internal.js" "$MODELS_DIR/wasm/"
cp "$NODE_MODULES_WASM/vision_wasm_nosimd_internal.wasm" "$MODELS_DIR/wasm/"

echo "Fertig: Modelle liegen unter $MODELS_DIR"
