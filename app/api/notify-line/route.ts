import { NextResponse } from 'next/server';

// 🟢 ใส่ Token และ Target ID ของบอสที่นี่ (ปลอดภัยเพราะรันบน Server)
const LINE_CHANNEL_ACCESS_TOKEN = 'Hc0qtV0xC09Ry7lrPQ24FQdRp9XATOWIOOc4SVa/zc8TotlBGnJkropJ42SZRPu78yI9aAz98Y3CqJXNzvJtsAwpQTXNR1MrVa0sUBL+3YPOMdNZcj1PCU9rDTZ3egbazYAYXFJqv3QJqBVCrslHvgdB04t89/1O/w1cDnyilFU='; 
const LINE_TARGET_ID = 'Ccbf8a8d104dd53e7cfc08e98d48caf2f'; 

export async function POST(request: Request) {
  try {
    const { message, imageUrl } = await request.json();

    // ประกอบร่างข้อความที่จะส่ง
    const messagesPayload: any[] = [
      {
        type: 'text',
        text: message,
      },
    ];

    // ถ้ามีการแนบสลิปมาด้วย ให้เพิ่มประเภทรูปภาพเข้าไปในแพ็กเกจ
    if (imageUrl) {
      messagesPayload.push({
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      });
    }

    // ยิง API ไปหา LINE ทันที
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_TARGET_ID,
        messages: messagesPayload,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('LINE API Error:', errorData);
      return NextResponse.json({ success: false, error: errorData }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'ส่งแจ้งเตือนเข้า LINE เรียบร้อย!' });
  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}