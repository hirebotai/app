; Inno Setup Script for HirebotAI (PyInstaller onedir/folder build)
; Compile with: ISCC.exe setup.iss  (run from project root)

[Setup]
AppName=HirebotAI
AppVersion=1.17.8.26
AppPublisher=HirebotAI Team
DefaultDirName={localappdata}\HirebotAI
DefaultGroupName=HirebotAI
OutputDir=.\Output
OutputBaseFilename=HirebotAI_Setup
Compression=lzma2/max
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
; Per-user install avoids UAC prompts and Program Files write issues.

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
; Desktop shortcut is created automatically on every install (see [Icons]).
Name: "startup"; Description: "Run Hirebotai automatically at Windows startup"; GroupDescription: "Additional options:"

[Files]
; Folder-mode build: all binaries + _internal/ are copied without extraction temp files.
Source: "dist\Hirebotai\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Hirebotai"; Filename: "{app}\Hirebotai.exe"; IconFilename: "{app}\Hirebotai.exe"
Name: "{group}\Uninstall HirebotAI"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Hirebotai"; Filename: "{app}\Hirebotai.exe"; IconFilename: "{app}\Hirebotai.exe"

[Run]
Filename: "{app}\Hirebotai.exe"; Description: "Launch Hirebotai now"; Flags: nowait postinstall skipifsilent

[Registry]
; Auto-start the stealth engine at logon (writes into HKCU, no admin needed).
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "Hirebotai"; ValueData: """{app}\Hirebotai.exe"" --engine"; Flags: uninsdeletevalue; Tasks: startup

[UninstallRun]
; Stop the running engine on uninstall (best-effort).
Filename: "taskkill"; Parameters: "/IM Hirebotai.exe /F"; Flags: runhidden; MinVersion: 6.0
