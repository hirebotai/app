import { NextResponse } from 'next/server';
import fs from 'fs';

export async function GET() {
  try {
    const filePath = process.env.WINDOWS_INSTALLER_PATH || 'public/HirebotAI_Setup.exe';
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Installer not found on server.' },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(filePath);
    const stat = fs.statSync(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="HirebotAI_Setup.exe"',
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to serve installer.' },
      { status: 500 }
    );
  }
}
