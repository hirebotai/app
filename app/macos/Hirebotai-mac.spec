# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for the Hirebotai macOS build (universal2, ad-hoc signed).
# Build:  pyinstaller macos/Hirebotai-mac.spec --noconfirm
# Paths below are relative to this spec file (macos/).

from PyInstaller.utils.hooks import collect_data_files

a = Analysis(
    ['../dashboard.py'],
    pathex=['..'],
    binaries=[],
    datas=[
        ('../dashboard', 'dashboard'),
        ('../logo.png', '.'),
        ('../interviewer_avatar.jpg', '.'),
        ('./mac_support.py', 'macos'),
    ] + collect_data_files('certifi'),
    hiddenimports=[
        'google.genai',
        'pynput.keyboard._darwin',
        'pynput.mouse._darwin',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'comtypes',
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
    a.datas,
    [],
    name='Hirebotai',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    argv_emulation=False,
    codesign_identity=None,
    entitlements_file=None,
)

app = BUNDLE(
    exe,
    name='Hirebotai.app',
    icon='../app.icns',
    bundle_identifier='ai.hirebotai.app',
    info_plist={
        'CFBundleDisplayName': 'Hirebotai',
        'CFBundleName': 'Hirebotai',
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleVersion': '1',
        'NSMicrophoneUsageDescription': 'Hirebotai listens to system audio for interview practice.',
        'NSAppleEventsUsageDescription': 'Hirebotai reads the front-most window during screen solving.',
        'LSApplicationCategoryType': 'public.app-category.productivity',
    },
)
