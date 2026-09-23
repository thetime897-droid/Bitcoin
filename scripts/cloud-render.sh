#!/usr/bin/env bash
# Renders the current episode as Short (9:16) and Long (16:9) and writes
# chat-sized copies (<= ~27 MB) next to them.
#
# Usage: bash scripts/cloud-render.sh [name-prefix]
# Output: out/<prefix>-short.mp4, out/<prefix>-long.mp4 (+ -web.mp4 versions)
set -euo pipefail
cd "$(dirname "$0")/.."

PREFIX="${1:-marktupdate-$(date +%Y-%m-%d)}"

# Full ffmpeg (for the size-limited web copies). The cloud image's apt lists
# can be stale, so update first.
if ! command -v ffmpeg >/dev/null 2>&1 || ! ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264; then
  apt-get update -qq >/dev/null 2>&1 || true
  apt-get install -y -qq --no-install-recommends ffmpeg >/dev/null
fi

[ -d node_modules ] || npm ci --no-audit --no-fund

# Remotion cannot download its own Chrome in the sandbox; reuse Playwright's.
BROWSER_FLAG=()
HEADLESS="$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null | head -1 || true)"
[ -n "$HEADLESS" ] && BROWSER_FLAG=(--browser-executable="$HEADLESS")

CONCURRENCY="$(nproc)"
mkdir -p out

for comp in Short Long; do
  lower="$(echo "$comp" | tr '[:upper:]' '[:lower:]')"
  master="out/${PREFIX}-${lower}.mp4"
  start=$(date +%s)
  npx remotion render "$comp" --concurrency="$CONCURRENCY" "${BROWSER_FLAG[@]}" "$master" 2>&1 | grep -E "rror|\+ " | tail -3
  echo "$comp rendered in $(( $(date +%s) - start ))s -> $master"

  # Chat uploads are limited to 30 MiB: size the bitrate to the duration.
  dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$master")"
  vkbps="$(awk -v d="$dur" 'BEGIN { k = int(27 * 8 * 1024 / d) - 170; if (k > 6000) k = 6000; print k }')"
  ffmpeg -y -loglevel error -i "$master" -c:v libx264 -preset slow -b:v "${vkbps}k" -maxrate "$((vkbps * 3 / 2))k" -bufsize "$((vkbps * 2))k" \
    -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "out/${PREFIX}-${lower}-web.mp4"
  echo "web copy: out/${PREFIX}-${lower}-web.mp4 ($(du -h "out/${PREFIX}-${lower}-web.mp4" | cut -f1))"
done
