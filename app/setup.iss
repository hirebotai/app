; Inno Setup Script for HirebotAI (PyInstaller onefile exe)
; Save as setup.iss and compile with Inno Setup Compiler (ISCC.exe)

[Setup]
AppName=HireBot AI
AppVersion=1.17.8.26
AppPublisher=HireBotAI Team
DefaultDirName={localappdata}\HireBotAI
DefaultGroupName=HireBot AI
OutputDir=.\Output
OutputBaseFilename=HireBotAi_Setup
Compression=lzma2/max
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
; Per-user install avoids UAC prompts and Program Files write issues.

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
; Desktop shortcut is created automatically on every install (see [Icons]).
Name: "startup"; Description: "Run HireBotAI automatically at Windows startup"; GroupDescription: "Additional options:"

[Files]
; The onedir exe carries dashboard/, logo, avatar and icon internally.
Source: "dist\Hirebotai\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Shortcuts are created automatically — no checkbox, so the user always gets
; a Start Menu entry and a Desktop icon for direct access.
Name: "{group}\HireBotAI"; Filename: "{app}\Hirebotai.exe"; IconFilename: "{app}\Hirebotai.exe"
Name: "{group}\Uninstall HireBot AI"; Filename: "{uninstallexe}"
Name: "{autodesktop}\HireBotAI"; Filename: "{app}\Hirebotai.exe"; IconFilename: "{app}\Hirebotai.exe"

[Run]
Filename: "{app}\Hirebotai.exe"; Description: "Launch HireBotAI now"; Flags: nowait postinstall skipifsilent

[Registry]
; Auto-start the stealth engine at logon (writes into HKCU, no admin needed).
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "HireBotAI"; ValueData: """{app}\Hirebotai.exe"" --engine"; Flags: uninsdeletevalue; Tasks: startup

[UninstallRun]
; Stop the running engine on uninstall (best-effort).
Filename: "taskkill"; Parameters: "/IM Hirebotai.exe /F"; Flags: runhidden; MinVersion: 6.0
