; Custom NSIS installer script for Mobile Roma Phone Shop Management
; This script handles installation and uninstallation including AppData cleanup

!include "MUI2.nsh"
!include "FileFunc.nsh"

; Custom installer pages
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Mobile Roma"

; Custom uninstaller configuration
!define MUI_UNFINISHPAGE_NOAUTOCLOSE

; Installer sections
Section "MainInstall" SecMain
  ; This section is handled by electron-builder
SectionEnd

; Custom uninstaller section
Section "Uninstall"
  ; Standard uninstall operations handled by electron-builder
  
  ; Ask user if they want to delete application data
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to delete all application data including database and settings?$\r$\n$\r$\nThis will permanently remove all your phone shop data, sales records, inventory, and settings.$\r$\n$\r$\nChoose 'Yes' to delete all data or 'No' to keep your data for future use." \
    /SD IDNO IDYES delete_appdata IDNO keep_appdata
    
  delete_appdata:
    DetailPrint "Removing application data..."
    
    ; Get the AppData path for the current user
    ReadEnvStr $0 "APPDATA"
    
    ; Remove the Mobile Roma application data directory
    ; This is where Electron stores userData by default
    RMDir /r "$0\mobile-roma"
    
    ; Also check for any potential alternative naming
    RMDir /r "$0\Mobile Roma"
    RMDir /r "$0\com.mobilerema.phoneShop"
    
    ; Remove any remaining configuration files
    Delete "$0\mobile-roma\*.*"
    
    DetailPrint "Application data removed successfully."
    Goto uninstall_complete
    
  keep_appdata:
    DetailPrint "Application data preserved."
    MessageBox MB_OK|MB_ICONINFORMATION \
      "Your application data has been preserved.$\r$\n$\r$\nLocation: %APPDATA%\mobile-roma$\r$\n$\r$\nIf you reinstall Mobile Roma, your data will be available."
    
  uninstall_complete:
    DetailPrint "Uninstallation completed."
    
SectionEnd

; Custom function to run after installation
Function .onInstSuccess
  MessageBox MB_OK|MB_ICONINFORMATION \
    "Mobile Roma has been installed successfully!$\r$\n$\r$\nYour application data will be stored in:$\r$\n%APPDATA%\mobile-roma$\r$\n$\r$\nThis ensures your data persists across updates."
FunctionEnd

; Custom function before uninstall starts
Function un.onInit
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Are you sure you want to uninstall Mobile Roma Phone Shop Management?" \
    /SD IDYES IDYES proceed IDNO abort
  
  abort:
    Abort
    
  proceed:
FunctionEnd

; Custom function after uninstall completes
Function un.onUninstSuccess
  MessageBox MB_OK|MB_ICONINFORMATION \
    "Mobile Roma has been successfully removed from your computer.$\r$\n$\r$\nThank you for using Mobile Roma Phone Shop Management!"
FunctionEnd
