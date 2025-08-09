# Custom NSIS installer script for GiLi PoS

# Define installer behavior
!define PRODUCT_NAME "GiLi Point of Sale"
!define PRODUCT_VERSION "${VERSION}"
!define PRODUCT_PUBLISHER "GiLi Team"
!define PRODUCT_WEB_SITE "https://gili.com"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

# Prerequisites check
Section "Prerequisites Check"
    # Check Windows version (Windows 10 or later)
    ${If} ${AtMostWinVista}
        MessageBox MB_OK|MB_ICONSTOP "GiLi PoS requires Windows 10 or later."
        Abort
    ${EndIf}
    
    # Check available disk space (minimum 500MB)
    ${GetRoot} "$INSTDIR" $R0
    ${DriveSpace} $R0 "/D=F /S=M" $R1
    ${If} $R1 < 500
        MessageBox MB_OK|MB_ICONSTOP "Insufficient disk space. At least 500MB is required."
        Abort
    ${EndIf}
    
    # Check if Visual C++ Redistributable is installed
    ReadRegStr $R0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
    ${If} $R0 != "1"
        MessageBox MB_YESNO|MB_ICONQUESTION "Microsoft Visual C++ Redistributable is required but not found. Download and install it now?" IDYES vcredist_yes IDNO vcredist_no
        vcredist_yes:
            ExecWait "https://aka.ms/vs/17/release/vc_redist.x64.exe"
            Goto vcredist_end
        vcredist_no:
            MessageBox MB_OK|MB_ICONINFORMATION "GiLi PoS may not work properly without Visual C++ Redistributable."
        vcredist_end:
    ${EndIf}
SectionEnd

# Hardware configuration section
Section "Hardware Configuration" SEC_HARDWARE
    # Create hardware configuration directory
    CreateDirectory "$INSTDIR\config"
    
    # Copy default hardware templates
    File /oname="$INSTDIR\config\printer-templates.json" "${BUILD_RESOURCES_DIR}\printer-templates.json"
    File /oname="$INSTDIR\config\hardware-defaults.json" "${BUILD_RESOURCES_DIR}\hardware-defaults.json"
SectionEnd

# Sample data section (optional)
Section /o "Install Sample Data" SEC_SAMPLE_DATA
    # Create sample data directory
    CreateDirectory "$INSTDIR\sample-data"
    
    # Copy sample database
    File /oname="$INSTDIR\sample-data\sample-products.json" "${BUILD_RESOURCES_DIR}\sample-products.json"
    File /oname="$INSTDIR\sample-data\sample-customers.json" "${BUILD_RESOURCES_DIR}\sample-customers.json"
SectionEnd

# Start menu and desktop shortcuts
Section "Create Shortcuts" SEC_SHORTCUTS
    # Start Menu shortcuts
    CreateDirectory "$SMPROGRAMS\GiLi PoS"
    CreateShortCut "$SMPROGRAMS\GiLi PoS\GiLi PoS.lnk" "$INSTDIR\gili-pos.exe"
    CreateShortCut "$SMPROGRAMS\GiLi PoS\Uninstall GiLi PoS.lnk" "$INSTDIR\uninstall.exe"
    
    # Desktop shortcut
    CreateShortCut "$DESKTOP\GiLi PoS.lnk" "$INSTDIR\gili-pos.exe"
    
    # Quick Launch shortcut (if folder exists)
    ${If} ${FileExists} "$QUICKLAUNCH"
        CreateShortCut "$QUICKLAUNCH\GiLi PoS.lnk" "$INSTDIR\gili-pos.exe"
    ${EndIf}
SectionEnd

# Windows Firewall configuration
Section "Configure Windows Firewall" SEC_FIREWALL
    # Add firewall exception for GiLi PoS
    ExecWait 'netsh advfirewall firewall add rule name="GiLi PoS" dir=in action=allow program="$INSTDIR\gili-pos.exe" enable=yes profile=any'
    ExecWait 'netsh advfirewall firewall add rule name="GiLi PoS Sync" dir=out action=allow program="$INSTDIR\gili-pos.exe" enable=yes profile=any'
SectionEnd

# Service registration (for auto-start)
Section /o "Auto-start with Windows" SEC_AUTOSTART
    # Create registry entry for auto-start
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "GiLi PoS" "$INSTDIR\gili-pos.exe --minimize"
SectionEnd

# File associations
Section "File Associations" SEC_ASSOCIATIONS
    # Register .gilipos file extension
    WriteRegStr HKCR ".gilipos" "" "GiLiPoSDataFile"
    WriteRegStr HKCR "GiLiPoSDataFile" "" "GiLi PoS Data File"
    WriteRegStr HKCR "GiLiPoSDataFile\DefaultIcon" "" "$INSTDIR\gili-pos.exe,1"
    WriteRegStr HKCR "GiLiPoSDataFile\shell\open\command" "" '"$INSTDIR\gili-pos.exe" "%1"'
    
    # Refresh shell
    System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
SectionEnd

# Create application data directories
Section "Application Data Setup" SEC_APPDATA
    # Create application data directories
    CreateDirectory "$APPDATA\gili-pos"
    CreateDirectory "$APPDATA\gili-pos\logs"
    CreateDirectory "$APPDATA\gili-pos\backups"
    CreateDirectory "$APPDATA\gili-pos\temp"
    
    # Set permissions for application data
    AccessControl::GrantOnFile "$APPDATA\gili-pos" "(BU)" "FullAccess"
SectionEnd

# Database initialization
Section "Database Setup" SEC_DATABASE
    # Initialize empty database
    ExecWait '"$INSTDIR\gili-pos.exe" --init-database --no-gui'
SectionEnd

# Uninstaller section
Section "Uninstall"
    # Remove application files
    Delete "$INSTDIR\*.*"
    RMDir /r "$INSTDIR"
    
    # Remove shortcuts
    Delete "$DESKTOP\GiLi PoS.lnk"
    Delete "$SMPROGRAMS\GiLi PoS\*.*"
    RMDir "$SMPROGRAMS\GiLi PoS"
    Delete "$QUICKLAUNCH\GiLi PoS.lnk"
    
    # Remove registry entries
    DeleteRegKey HKCR ".gilipos"
    DeleteRegKey HKCR "GiLiPoSDataFile"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "GiLi PoS"
    
    # Remove firewall rules
    ExecWait 'netsh advfirewall firewall delete rule name="GiLi PoS"'
    ExecWait 'netsh advfirewall firewall delete rule name="GiLi PoS Sync"'
    
    # Ask to remove user data
    MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove all GiLi PoS data (including sales records and settings)?" IDYES remove_data IDNO keep_data
    remove_data:
        RMDir /r "$APPDATA\gili-pos"
        Goto data_end
    keep_data:
        MessageBox MB_OK|MB_ICONINFORMATION "User data has been preserved in $APPDATA\gili-pos"
    data_end:
    
    # Refresh shell
    System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
    
    # Remove uninstaller registry key
    DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
SectionEnd

# Section descriptions
LangString DESC_SEC_HARDWARE ${LANG_ENGLISH} "Install hardware configuration templates for printers and scanners."
LangString DESC_SEC_SAMPLE_DATA ${LANG_ENGLISH} "Install sample products and customers for testing (optional)."
LangString DESC_SEC_SHORTCUTS ${LANG_ENGLISH} "Create Start Menu and Desktop shortcuts."
LangString DESC_SEC_FIREWALL ${LANG_ENGLISH} "Configure Windows Firewall to allow GiLi PoS network access."
LangString DESC_SEC_AUTOSTART ${LANG_ENGLISH} "Automatically start GiLi PoS when Windows starts (optional)."
LangString DESC_SEC_ASSOCIATIONS ${LANG_ENGLISH} "Associate .gilipos files with GiLi PoS."
LangString DESC_SEC_APPDATA ${LANG_ENGLISH} "Create application data directories and set permissions."
LangString DESC_SEC_DATABASE ${LANG_ENGLISH} "Initialize the local database."

# Assign section descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_HARDWARE} $(DESC_SEC_HARDWARE)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_SAMPLE_DATA} $(DESC_SEC_SAMPLE_DATA)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_SHORTCUTS} $(DESC_SEC_SHORTCUTS)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_FIREWALL} $(DESC_SEC_FIREWALL)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_AUTOSTART} $(DESC_SEC_AUTOSTART)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_ASSOCIATIONS} $(DESC_SEC_ASSOCIATIONS)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_APPDATA} $(DESC_SEC_APPDATA)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_DATABASE} $(DESC_SEC_DATABASE)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

# Installer finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\gili-pos.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch GiLi PoS now"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "View README file"

# Post-install message
Function .onInstSuccess
    MessageBox MB_OK|MB_ICONINFORMATION "GiLi Point of Sale has been installed successfully!$\n$\nImportant:$\n• Configure your hardware settings before first use$\n• Default login: admin / Admin123!$\n• Change the default password immediately$\n$\nFor support, visit https://support.gili.com"
FunctionEnd