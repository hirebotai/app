# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for Hirebotai onefile build.
# Build:  pyinstaller Hirebotai.spec

from PyInstaller.utils.hooks import collect_data_files

a = Analysis(
    ['dashboard.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('dashboard', 'dashboard'),
        ('logo.png', '.'),
        ('interviewer_avatar.jpg', '.'),
        ('app.ico', '.'),
    ] + collect_data_files('certifi'),
    hiddenimports=[
        'comtypes.gen.UIAutomationClient',
        'google.genai',
        'pynput.keyboard._win32',
        'pynput.mouse._win32',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'PyQt5', 'PyQt6', 'tkinter',
        'pytest', 'setuptools', 'pip',
    ],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name='Hirebotai',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=True,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    icon='app.ico',
)
