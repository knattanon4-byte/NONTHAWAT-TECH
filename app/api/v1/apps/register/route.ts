import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. ดึงสิทธิ์เชื่อมต่อกับ Supabase หลังบ้าน
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    // 2. ตรวจสอบความปลอดภัยด้วยรหัสลับ System Token
    const authHeader = request.headers.get('authorization');
    const systemToken = process.env.CORE_SYSTEM_TOKEN; 

    if (!authHeader || authHeader !== `Bearer ${systemToken}`) {
      return NextResponse.json({ error: 'Unauthorized Node Signal' }, { status: 401 });
    }

    // 3. แกะกล่องข้อมูลที่แอปย่อยยิงรายงานตัวส่งมา
    const body = await request.json();
    const { app_id, app_name, tech_stack, category, status } = body;

    // 4. ทำการ Upsert เข้าตาราง applications (ถ้าไม่มีให้คีย์ใหม่ ถ้ามีไอดีเดิมให้ระเบิดสเตตัสล่าสุดทับ)
    const { data, error } = await supabase
      .from('applications') 
      .upsert({
        id: app_id, 
        name: app_name,
        tech_stack: tech_stack,
        category: category,
        status: status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'App Vector Registry Synchronized', data }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}