#!/bin/zsh

set -u

APP_NAME="ToT 日程.app"
APP_PATH=""

if [[ $# -gt 0 && -d "$1" ]]; then
  APP_PATH="$1"
fi

if [[ -z "$APP_PATH" ]]; then
  for candidate in "/Applications/$APP_NAME" "$HOME/Applications/$APP_NAME"; do
    if [[ -d "$candidate" ]]; then
      APP_PATH="$candidate"
      break
    fi
  done
fi

if [[ -z "$APP_PATH" ]]; then
  APP_PATH=$(/usr/bin/osascript <<'APPLESCRIPT' 2>/dev/null
try
  POSIX path of (choose application with prompt "请选择已经复制到“应用程序”文件夹的 ToT 日程")
on error number -128
  return ""
end try
APPLESCRIPT
  )
fi

if [[ -z "$APP_PATH" || ! -d "$APP_PATH" ]]; then
  /usr/bin/osascript -e 'display alert "未找到 ToT 日程" message "请先把应用拖入“应用程序”文件夹，再运行此脚本。" as warning' 2>/dev/null
  exit 1
fi

clear_quarantine() {
  /usr/bin/xattr -r -d com.apple.quarantine "$APP_PATH" 2>/dev/null || true
  ! /usr/bin/xattr -r "$APP_PATH" 2>/dev/null | /usr/bin/grep -q 'com.apple.quarantine'
}

if ! clear_quarantine; then
  echo "需要管理员权限来修复：$APP_PATH"
  /usr/bin/sudo /usr/bin/xattr -r -d com.apple.quarantine "$APP_PATH" 2>/dev/null || true
fi

if /usr/bin/xattr -r "$APP_PATH" 2>/dev/null | /usr/bin/grep -q 'com.apple.quarantine'; then
  /usr/bin/osascript -e 'display alert "修复失败" message "未能移除应用的隔离属性，请确认当前账户有权限修改该应用。" as critical' 2>/dev/null
  exit 1
fi

/usr/bin/osascript -e 'display alert "修复完成" message "现在可以从“应用程序”文件夹打开 ToT 日程。" as informational' 2>/dev/null
echo "修复完成：$APP_PATH"

