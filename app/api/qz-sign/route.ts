import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const toSign = searchParams.get('request');

    if (!toSign) {
      return new NextResponse('Missing request parameter', { status: 400 });
    }

    const keyPath = path.join(process.cwd(), 'qz-key.pem');
    const privateKey = fs.readFileSync(keyPath, 'utf8');

    // QZ Tray requires SHA-512 signing by default, but typically falls back to SHA-1 or SHA-256 if configured.
    // The default in QZ Tray 2.x is SHA512.
    const signer = crypto.createSign('RSA-SHA512');
    signer.update(toSign);
    
    // QZ Tray expects a Base64 encoded signature
    const signature = signer.sign(privateKey, 'base64');

    return new NextResponse(signature, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error signing QZ request:', error);
    return new NextResponse('Signing failed', { status: 500 });
  }
}
