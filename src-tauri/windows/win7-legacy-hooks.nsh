; Windows 7 can only run the WebView2 109 line. The current evergreen
; bootstrapper no longer starts on Windows 7, so the Legacy installer fetches
; Microsoft's final x64 offline runtime from the Microsoft Update Catalog.
!define WIN7_WEBVIEW2_APP_GUID "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
!define WIN7_WEBVIEW2_VERSION "109.0.1518.140"
!define WIN7_WEBVIEW2_URL "https://catalog.s.download.windowsupdate.com/c/msdownload/update/software/updt/2023/09/microsoftedgestandaloneinstallerx64_1c890b4b8dd6b7c93da98ebdc08ecdc5e30e50cb.exe"
!define WIN7_WEBVIEW2_SHA256 "eac95c8095ec5f9971eade9827d8fb67fd251f5c16e702b5312d31067e39119b"
!define WIN7_WEBVIEW2_INSTALLER "$TEMP\MicrosoftEdgeWebView2Runtime-109-x64.exe"

!macro NSIS_HOOK_PREINSTALL
  Push $R0
  Push $R1
  Push $R2
  Push $R3

  ; Prefer a machine-wide runtime and fall back to the current user's runtime.
  ${If} ${RunningX64}
    ReadRegStr $R0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\${WIN7_WEBVIEW2_APP_GUID}" "pv"
  ${Else}
    ReadRegStr $R0 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WIN7_WEBVIEW2_APP_GUID}" "pv"
  ${EndIf}
  ${If} $R0 == ""
    ReadRegStr $R0 HKCU "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WIN7_WEBVIEW2_APP_GUID}" "pv"
  ${EndIf}

  ; VersionCompare returns 1 when the requested version is newer.
  StrCpy $R1 1
  ${If} $R0 != ""
    ${VersionCompare} "${WIN7_WEBVIEW2_VERSION}" "$R0" $R1
  ${EndIf}

  ${If} $R1 == 1
    DetailPrint "正在下载 Windows 7 兼容的 WebView2 109（约 144 MB）..."
    Delete "${WIN7_WEBVIEW2_INSTALLER}"
    NSISdl::download /TIMEOUT=300000 "${WIN7_WEBVIEW2_URL}" "${WIN7_WEBVIEW2_INSTALLER}"
    Pop $R2
    ${If} $R2 != "success"
      Delete "${WIN7_WEBVIEW2_INSTALLER}"
      MessageBox MB_ICONSTOP|MB_OK "无法下载 Windows 7 所需的 WebView2 109。请检查网络连接后重试。$\r$\n$\r$\n下载错误：$R2"
      Abort
    ${EndIf}

    ; certutil is included with Windows 7. Match the known hash in its output,
    ; avoiding locale-dependent parsing of the surrounding text.
    nsExec::ExecToStack '"$SYSDIR\certutil.exe" -hashfile "${WIN7_WEBVIEW2_INSTALLER}" SHA256'
    Pop $R2
    Pop $R3
    ${StrCase} $R3 $R3 "L"
    ${StrLoc} $R2 $R3 "${WIN7_WEBVIEW2_SHA256}" ">"
    ${If} $R2 == ""
      Delete "${WIN7_WEBVIEW2_INSTALLER}"
      MessageBox MB_ICONSTOP|MB_OK "WebView2 109 下载文件校验失败，安装已停止。请重新下载安装包后再试。"
      Abort
    ${EndIf}

    DetailPrint "正在安装 Windows 7 兼容的 WebView2 109..."
    ExecWait '"${WIN7_WEBVIEW2_INSTALLER}" /silent /install' $R2
    Delete "${WIN7_WEBVIEW2_INSTALLER}"
    ${If} $R2 != 0
      MessageBox MB_ICONSTOP|MB_OK "WebView2 109 安装失败（错误代码：$R2）。ToT 日程 Legacy 尚未安装。"
      Abort
    ${EndIf}
  ${EndIf}

  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
!macroend
