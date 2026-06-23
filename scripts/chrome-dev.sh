#!/usr/bin/env bash
# Build, restart Chrome, and load the latest unpacked extension for testing.
# Run with no arguments (or `run`) for the full update loop.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
EXT_PATH="$APP/.output/chrome-mv3"
CHROME_URL="${CHROME_DEV_URL:-https://home.kcg.ac.jp/portal}"
USE_SYSTEM_PROFILE="${CHROME_USE_SYSTEM_PROFILE:-1}"
PROFILE_DIRECTORY="${CHROME_PROFILE_DIRECTORY:-}"
PROFILE_DIR=""
PROFILE_PREFS_DIR=""
PID_FILE=""

resolve_profile_config() {
  if [[ "$USE_SYSTEM_PROFILE" == "1" ]]; then
    case "$(uname -s)" in
      Darwin)
        PROFILE_DIR="${CHROME_DEV_PROFILE_DIR:-$HOME/Library/Application Support/Google/Chrome}"
        ;;
      Linux)
        PROFILE_DIR="${CHROME_DEV_PROFILE_DIR:-$HOME/.config/google-chrome}"
        ;;
      *)
        echo "error: CHROME_USE_SYSTEM_PROFILE=1 is unsupported on this OS" >&2
        exit 1
        ;;
    esac
    if [[ -z "$PROFILE_DIRECTORY" ]]; then
      PROFILE_DIRECTORY="$(detect_last_used_profile "$PROFILE_DIR")"
    fi
    PROFILE_PREFS_DIR="$PROFILE_DIR/$PROFILE_DIRECTORY"
    PID_FILE="$APP/.chrome-dev-profile/system-chrome.pid"
  else
    PROFILE_DIR="${CHROME_DEV_PROFILE_DIR:-$APP/.chrome-dev-profile}"
    PROFILE_PREFS_DIR="$PROFILE_DIR"
    PID_FILE="$PROFILE_DIR/chrome.pid"
  fi
}

detect_last_used_profile() {
  local state_file="$1/Local State"
  if [[ -f "$state_file" ]] && command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY' "$state_file" 2>/dev/null || echo "Default"
import json
import sys

with open(sys.argv[1], encoding="utf-8") as fh:
    data = json.load(fh)
print(data.get("profile", {}).get("last_used") or "Default")
PY
  else
    echo "Default"
  fi
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [command]

Commands:
  (none)    Build, restart Chrome, load extension, verify freshness (default)
  run       Same as no command
  restart   Alias for run
  stop      Stop Chrome for this profile
  status    Print paths and whether Chrome is running
  verify    Verify build output is loaded in running Chrome

Examples:
  ./scripts/chrome-dev.sh
  CHROME_USE_SYSTEM_PROFILE=0 ./scripts/chrome-dev.sh

Environment:
  CHROME_USE_SYSTEM_PROFILE  1 = everyday Chrome profile (default), 0 = isolated dev profile
  CHROME_PROFILE_DIRECTORY   Profile folder name (default: last-used from Local State)
  CHROME_DEV_PROFILE_DIR     Override Chrome user-data-dir path
  CHROME_DEV_URL             Tab opened after launch (default: https://home.kcg.ac.jp/portal)
  CHROME_BIN                 Chrome/Chromium binary (auto-detected)
  NO_BUILD=1                 Skip npm run build
EOF
}

find_chrome() {
  if [[ -n "${CHROME_BIN:-}" && -x "$CHROME_BIN" ]]; then
    return 0
  fi

  case "$(uname -s)" in
    Darwin)
      if [[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
        CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        CHROME_APP="Google Chrome"
        return 0
      fi
      if [[ -x "/Applications/Chromium.app/Contents/MacOS/Chromium" ]]; then
        CHROME_BIN="/Applications/Chromium.app/Contents/MacOS/Chromium"
        CHROME_APP="Chromium"
        return 0
      fi
      ;;
    Linux)
      for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
        if command -v "$candidate" >/dev/null 2>&1; then
          CHROME_BIN="$(command -v "$candidate")"
          return 0
        fi
      done
      ;;
  esac

  echo "error: Chrome/Chromium not found. Set CHROME_BIN to the browser binary." >&2
  return 1
}

profile_running() {
  if [[ "$USE_SYSTEM_PROFILE" == "1" ]]; then
    pgrep -x "Google Chrome" >/dev/null 2>&1 \
      || pgrep -x "Google Chrome Helper" >/dev/null 2>&1 \
      || [[ -S "$PROFILE_DIR/SingletonSocket" ]]
  else
    pgrep -f "user-data-dir=${PROFILE_DIR}" >/dev/null 2>&1
  fi
}

quit_chrome_app() {
  case "$(uname -s)" in
    Darwin)
      osascript -e 'tell application "Google Chrome" to quit' >/dev/null 2>&1 || true
      ;;
    Linux)
      pkill -x chrome >/dev/null 2>&1 || pkill -x google-chrome >/dev/null 2>&1 || true
      ;;
  esac
}

stop_chrome() {
  if profile_running; then
    if [[ "$USE_SYSTEM_PROFILE" == "1" ]]; then
      echo "quit: Google Chrome"
      quit_chrome_app
    else
      pkill -f "user-data-dir=${PROFILE_DIR}" || true
    fi
    for _ in $(seq 1 40); do
      profile_running || break
      sleep 0.25
    done
  fi
  rm -f "$PID_FILE"
}

build_extension() {
  if [[ "${NO_BUILD:-}" == "1" ]]; then
    echo "skip: build (NO_BUILD=1)"
    return 0
  fi
  echo "build: npm run build"
  (cd "$APP" && npm run build)
  date +%s >"$EXT_PATH/.build-stamp"
}

assert_extension_built() {
  if [[ ! -f "$EXT_PATH/manifest.json" ]]; then
    echo "error: extension not built at $EXT_PATH" >&2
    return 1
  fi
}

current_chrome_pid() {
  local pid=""
  if [[ -f "$PID_FILE" ]]; then
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  fi
  if [[ -z "$pid" ]]; then
    pid="$(pgrep -x "Google Chrome" | head -1 || pgrep -f "user-data-dir=${PROFILE_DIR}" | head -1 || true)"
  fi
  echo "$pid"
}

verify_extension_loaded() {
  local pid="${1:-}"
  local build_file="$EXT_PATH/content-scripts/portal.js"
  local registered_path=""
  local load_arg=""
  local secure_prefs="$PROFILE_PREFS_DIR/Secure Preferences"

  if [[ ! -f "$build_file" ]]; then
    echo "error: build artifact missing: $build_file" >&2
    return 1
  fi

  load_arg="$(ps ax -o command= | rg -o -- "--load-extension=${EXT_PATH}" | head -1 || true)"
  if [[ -n "$load_arg" ]]; then
    echo "extension-load=command-line"
    echo "extension-load-path=$EXT_PATH"
  elif [[ -f "$secure_prefs" ]] && command -v python3 >/dev/null 2>&1; then
    registered_path="$(python3 - <<'PY' "$secure_prefs" "$EXT_PATH"
import json
import sys
from pathlib import Path

prefs_path = Path(sys.argv[1])
target = Path(sys.argv[2]).resolve()
data = json.loads(prefs_path.read_text())
for info in data.get("extensions", {}).get("settings", {}).values():
    path = info.get("path")
    if not path:
        continue
    if Path(path).resolve() == target:
        print(path)
        break
PY
)"
    if [[ -n "$registered_path" ]]; then
      echo "extension-load=profile-unpacked"
      echo "extension-load-path=$registered_path"
    else
      echo "error: extension is not registered in the Chrome profile" >&2
      echo "hint: rerun ./scripts/chrome-dev.sh" >&2
      return 1
    fi
  else
    echo "error: Chrome is not running with --load-extension=$EXT_PATH" >&2
    echo "hint: rerun ./scripts/chrome-dev.sh" >&2
    return 1
  fi

  local manifest_version
  manifest_version="$(python3 - <<'PY' "$EXT_PATH/manifest.json"
import json
import sys
print(json.load(open(sys.argv[1], encoding="utf-8"))["version"])
PY
)"
  echo "extension-version=$manifest_version"

  if [[ -z "$pid" || "$pid" == "unknown" ]]; then
    echo "warn: cannot check build freshness without Chrome PID"
    return 0
  fi

  python3 - <<'PY' "$build_file" "$pid"
import sys
import time
import subprocess
from datetime import datetime
from pathlib import Path

build_file = Path(sys.argv[1])
pid = int(sys.argv[2])
build_mtime = build_file.stat().st_mtime

if sys.platform == "darwin":
    proc = subprocess.run(
        ["ps", "-p", str(pid), "-o", "lstart="],
        capture_output=True,
        text=True,
        check=False,
    )
    started = proc.stdout.strip()
    if not started:
        print("warn: cannot read Chrome process start time")
        raise SystemExit(0)
    chrome_start = datetime.strptime(started, "%a %b %d %H:%M:%S %Y").timestamp()
else:
    proc = subprocess.run(
        ["ps", "-p", str(pid), "-o", "etimes="],
        capture_output=True,
        text=True,
        check=False,
    )
    etimes_raw = proc.stdout.strip()
    if not etimes_raw:
        print("warn: cannot read Chrome process age")
        raise SystemExit(0)
    chrome_start = time.time() - float(etimes_raw)

if build_mtime > chrome_start + 1:
    print("error: Chrome started before the latest build")
    print(f"build_mtime={int(build_mtime)}")
    print(f"chrome_start={int(chrome_start)}")
    print("hint: rerun ./scripts/chrome-dev.sh")
    raise SystemExit(1)
print("extension-fresh=yes")
PY
}

start_chrome() {
  assert_extension_built

  if [[ "$USE_SYSTEM_PROFILE" != "1" ]]; then
    mkdir -p "$PROFILE_DIR"
  elif [[ ! -d "$PROFILE_DIR" ]]; then
    echo "error: system Chrome profile not found at $PROFILE_DIR" >&2
    return 1
  fi

  if profile_running; then
    echo "error: Google Chrome is still running" >&2
    echo "hint: ./scripts/chrome-dev.sh stop" >&2
    return 1
  fi

  find_chrome

  local args=(
    --user-data-dir="$PROFILE_DIR"
    --load-extension="$EXT_PATH"
    --no-first-run
    --no-default-browser-check
  )
  if [[ -n "$PROFILE_DIRECTORY" ]]; then
    args+=(--profile-directory="$PROFILE_DIRECTORY")
  fi
  args+=("$CHROME_URL")

  echo "launch: $CHROME_BIN"
  echo "  profile:   $PROFILE_DIR"
  if [[ -n "$PROFILE_DIRECTORY" ]]; then
    echo "  directory: $PROFILE_DIRECTORY"
  fi
  echo "  extension: $EXT_PATH"
  echo "  url:       $CHROME_URL"

  case "$(uname -s)" in
    Darwin)
      if [[ "$USE_SYSTEM_PROFILE" == "1" ]]; then
        open -a "${CHROME_APP:-Google Chrome}" --args "${args[@]}"
      else
        open -na "${CHROME_APP:-Google Chrome}" --args "${args[@]}"
      fi
      ;;
    *)
      "$CHROME_BIN" "${args[@]}" >/dev/null 2>&1 &
      ;;
  esac

  for _ in $(seq 1 40); do
    if profile_running; then
      current_chrome_pid >"$PID_FILE"
      break
    fi
    sleep 0.25
  done

  if ! profile_running; then
    echo "error: Chrome failed to start with profile $PROFILE_DIR" >&2
    return 1
  fi

  print_status
}

print_status() {
  local pid
  pid="$(current_chrome_pid)"

  echo "CHROME_USE_SYSTEM_PROFILE=$USE_SYSTEM_PROFILE"
  echo "CHROME_DEV_PROFILE=$PROFILE_DIR"
  if [[ -n "$PROFILE_DIRECTORY" ]]; then
    echo "CHROME_PROFILE_DIRECTORY=$PROFILE_DIRECTORY"
  fi
  echo "EXTENSION_PATH=$EXT_PATH"
  echo "CHROME_DEV_URL=$CHROME_URL"
  if profile_running; then
    echo "STATUS=running"
    echo "PID=${pid:-unknown}"
  else
    echo "STATUS=stopped"
  fi
}

run_dev_loop() {
  echo "step: stop Chrome"
  stop_chrome
  build_extension
  echo "step: launch Chrome with latest build"
  start_chrome
  echo "step: verify extension"
  verify_extension_loaded "$(current_chrome_pid)"
  echo "ready: latest extension loaded"
}

cmd_verify() {
  assert_extension_built
  print_status
  profile_running || exit 1
  verify_extension_loaded "$(current_chrome_pid)"
}

resolve_profile_config

cmd="${1:-run}"
case "$cmd" in
  run | restart | update | "")
    run_dev_loop
    ;;
  stop)
    stop_chrome
    print_status
    ;;
  status)
    print_status
    profile_running
    ;;
  verify)
    cmd_verify
    ;;
  -h | --help | help)
    usage
    ;;
  *)
    echo "error: unknown command: $cmd" >&2
    usage >&2
    exit 1
    ;;
esac
