import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopId, tableNumber, bookingDate, action } = body;

    if (!shopId || !tableNumber || !bookingDate || !action) {
      return NextResponse.json(
        { success: false, message: 'ข้อมูลไม่ครบถ้วน (Missing required fields)' },
        { status: 400 }
      );
    }

    // 🛡️ เคสที่ 1: สั่งล็อกโต๊ะแมนนวล
    if (action === 'lock') {
      const lockCode = `LOCK-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { data, error } = await supabaseAdmin
        .from('restaurant_bookings')
        .insert([
          {
            shop_id: shopId,
            booking_code: lockCode,
            customer_name: '🛡️ สตาฟฟ์ล็อกโต๊ะ (Walk-in / โทรจอง)',
            phone: '000-000-0000',
            booking_date: bookingDate,
            booking_time: '18:00:00',
            guests_count: 1,
            table_number: tableNumber,
            status: 'confirmed', 
          }
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { success: false, message: 'ตำแหน่งโต๊ะนี้ถูกล็อกหรือจองไปเรียบร้อยแล้วในระบบครับ' },
            { status: 400 }
          );
        }
        throw error;
      }

      return NextResponse.json({ success: true, message: 'TABLE_LOCKED_SUCCESS', data });
    }

    // 🔓 เคสที่ 2: สั่ง "ปลดล็อกโต๊ะ" (คืนพื้นที่ให้กลับมาว่างสิทธิ์ออนไลน์)
    if (action === 'unlock') {
      const { error } = await supabaseAdmin
        .from('restaurant_bookings')
        .delete()
        .eq('shop_id', shopId)
        .eq('booking_date', bookingDate)
        .eq('table_number', tableNumber)
        .like('booking_code', 'LOCK-%'); // 🚨 ไฮไลต์เด็ด: ดักลบเฉพาะคิวงานที่ขึ้นต้นด้วย LOCK- เท่านั้น ไม่แตะต้องคิวลูกค้าจริงเด็ดขาด

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'TABLE_UNLOCKED_SUCCESS' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action protocol' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Lock Table API Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}