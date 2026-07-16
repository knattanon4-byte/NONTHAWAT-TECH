import { NextResponse } from 'next/server';

// 🟢 ฝัง Token และ Room ID ของบอสตรงๆ ตามคำสั่งครับ
const LINE_CHANNEL_ACCESS_TOKEN = 'SioNMArve5JVCsXTXREDYSIZIiXT5J1TtHw3V1K/2ih3sfS+LU21hyHFTbRiJvtR8yI9aAz98Y3CqJXNzvJtsAwpQTXNR1MrVa0sUBL+3YO+nlm9rLtixKlaLP/+JzYxUNOuIkSXatMFUTUlmcUMRwdB04t89/1O/w1cDnyilFU='; 
const LINE_TARGET_ID = 'Ccbf8a8d104dd53e7cfc08e98d48caf2f'; 

export async function POST(request: Request) {
  try {
    const { message, imageUrl } = await request.json();

    // 1. เตรียมก้อนข้อความสรุปยอดจอง
    const messagesPayload: any[] = [
      {
        type: 'text',
        text: message,
      },
    ];

    // 2. ถ้าระบบส่งรูปลิงก์สลิปมาด้วย ให้ยัดลงไปเป็นรูปภาพเลย
    if (imageUrl) {
      messagesPayload.push({
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl, 
      });
    }

    // 3. ยิงคำสั่งไปที่ LINE Messaging API ทันที
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
      console.error('🚨 LINE API Error:', errorData);
      return NextResponse.json({ success: false, error: errorData }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'ส่งแจ้งเตือนและรูปสลิปเข้า LINE เรียบร้อย!' });
  } catch (error: any) {
    console.error('🚨 Server Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}