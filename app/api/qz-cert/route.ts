import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const certPath = path.join(process.cwd(), 'qz-cert.pem');
    const cert = fs.readFileSync(certPath, 'utf8');
    
    return new NextResponse(cert, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error reading QZ cert:', error);
    return new NextResponse('Certificate not found', { status: 404 });
  }
}
