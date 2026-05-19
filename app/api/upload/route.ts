import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as string | null

    if (!file || !bucket) {
      return NextResponse.json({ error: 'Missing file or bucket parameter' }, { status: 400 })
    }

    if (!['cafe-logos', 'menu-images'].includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket destination' }, { status: 400 })
    }

    const maxSizeBytes = bucket === 'cafe-logos' ? 500 * 1024 : 100 * 1024;
    
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ 
        error: `File size exceeds the limit. Max allowed for ${bucket} is ${maxSizeBytes / 1024}KB.` 
      }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${activeCafeResult.cafe.id}-${uuidv4()}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({ error: 'Failed to upload to storage' }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrlData.publicUrl }, { status: 200 })

  } catch (error: any) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: error?.message || 'Error processing upload' }, { status: 500 })
  }
}
