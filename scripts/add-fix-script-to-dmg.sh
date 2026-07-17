#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIX_SCRIPT="$PROJECT_ROOT/scripts/修复已损坏.command"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "错误：DMG 后处理只能在 macOS 上运行。" >&2
  exit 1
fi

if [[ ! -f "$FIX_SCRIPT" ]]; then
  echo "错误：找不到 $FIX_SCRIPT" >&2
  exit 1
fi

if [[ $# -gt 0 ]]; then
  DMG_FILES=("$@")
else
  shopt -s nullglob
  DMG_FILES=("$PROJECT_ROOT"/src-tauri/target/release/bundle/dmg/*.dmg)
  shopt -u nullglob
fi

if [[ ${#DMG_FILES[@]} -eq 0 ]]; then
  echo "错误：没有找到待处理的 DMG。" >&2
  exit 1
fi

for dmg in "${DMG_FILES[@]}"; do
  if [[ ! -f "$dmg" ]]; then
    echo "错误：DMG 不存在：$dmg" >&2
    exit 1
  fi

  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/tot-dmg.XXXXXX")"
  rw_dmg="$work_dir/image-rw.dmg"
  final_dmg="$work_dir/image-final.dmg"
  mount_dir="$work_dir/mount"
  device=""

  cleanup() {
    if [[ -n "$device" ]]; then
      /usr/bin/hdiutil detach "$device" -quiet 2>/dev/null || true
    fi
    rm -rf "$work_dir"
  }
  trap cleanup EXIT

  echo "正在写入修复脚本：$(basename "$dmg")"
  /usr/bin/hdiutil convert "$dmg" -format UDRW -o "$rw_dmg" -quiet

  image_bytes="$(/usr/bin/stat -f '%z' "$rw_dmg")"
  expanded_mb="$(( (image_bytes + 1048575) / 1048576 + 16 ))"
  /usr/bin/hdiutil resize -size "${expanded_mb}m" "$rw_dmg" -quiet

  mkdir -p "$mount_dir"
  attach_output="$(/usr/bin/hdiutil attach "$rw_dmg" -mountpoint "$mount_dir" -nobrowse -readwrite)"
  device="$(printf '%s\n' "$attach_output" | /usr/bin/awk '/Apple_HFS|Apple_APFS/ { device = $1 } END { print device }')"
  if [[ -z "$device" ]]; then
    echo "错误：无法挂载可写 DMG。" >&2
    exit 1
  fi

  /usr/bin/ditto "$FIX_SCRIPT" "$mount_dir/修复已损坏.command"
  chmod +x "$mount_dir/修复已损坏.command"
  sync
  /usr/bin/hdiutil detach "$device" -quiet
  device=""

  /usr/bin/hdiutil convert "$rw_dmg" -format UDZO -imagekey zlib-level=9 -o "$final_dmg" -quiet

  verify_dir="$work_dir/verify"
  mkdir -p "$verify_dir"
  verify_output="$(/usr/bin/hdiutil attach "$final_dmg" -mountpoint "$verify_dir" -nobrowse -readonly)"
  verify_device="$(printf '%s\n' "$verify_output" | /usr/bin/awk '/Apple_HFS|Apple_APFS/ { device = $1 } END { print device }')"
  if [[ -z "$verify_device" || ! -x "$verify_dir/修复已损坏.command" ]]; then
    [[ -n "$verify_device" ]] && /usr/bin/hdiutil detach "$verify_device" -quiet 2>/dev/null || true
    echo "错误：DMG 验证失败，原文件未被替换。" >&2
    exit 1
  fi
  /usr/bin/hdiutil detach "$verify_device" -quiet

  mv -f "$final_dmg" "$dmg"
  echo "完成：$dmg"
  trap - EXIT
  cleanup
done
