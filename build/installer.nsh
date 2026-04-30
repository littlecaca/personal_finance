# 仅在安装阶段定义逻辑
!ifndef BUILD_UNINSTALLER
  # 使用 README 宏来作为“创建桌面快捷方式”的复选框
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "创建桌面快捷方式"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION CreateDesktopShortcutFunc
  !define MUI_FINISHPAGE_SHOWREADME_CHECKED

  Function CreateDesktopShortcutFunc
    CreateShortCut "$DESKTOP\Finance Paper.lnk" "$INSTDIR\Finance Paper.exe"
  FunctionEnd
!endif

# 卸载逻辑
!macro customUnInstall
  Delete "$DESKTOP\Finance Paper.lnk"
  Delete "$SMPROGRAMS\Finance Paper\Finance Paper.lnk"
  RMDir "$SMPROGRAMS\Finance Paper"
!macroend
