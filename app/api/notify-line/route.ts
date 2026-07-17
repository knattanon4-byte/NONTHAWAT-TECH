import { NextResponse } from 'next/server';

const LINE_CHANNEL_ACCESS_TOKEN = 'lQyjTwldONqWljwu0zm0bXX7O/+rNwzBtbHqZyAjMP+aTv4YL+d3+mMGBC82pmnj8yI9aAz98Y3CqJXNzvJtsAwpQTXNR1MrVa0sUBL+3YPOiguyI7g/auod4mYoQfyl1R/Yz9rsKbvbZVSkAlUtsQdB04t89/1O/w1cDnyilFU='; 
const LINE_TARGET_ID = 'Ccbf8a8d104dd53e7cfc08e98d48caf2f'; 

export async function POST(request: Request) {
  try {
    const { message, imageUrl } = await request.json();

    const messagesPayload: any[] = [
      {
        type: 'text',
        text: message,
      },
    ];

    if (imageUrl) {
      messagesPayload.push({
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl, 
      });
    }

    // 🟢 ใช้ Push API เหมือนเดิม (ถูกต้องที่สุดสำหรับการยิงจากหน้าเว็บ)
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
      console.error('👉 LINE Response Status:', response.status); 
      console.error('🚨 LINE API Error Details:', JSON.stringify(errorData, null, 2)); 
      return NextResponse.json({ success: false, error: errorData }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: 'ส่งแจ้งเตือนและรูปสลิปเข้า LINE เรียบร้อย!' });
  } catch (error: any) {
    console.error('🚨 Server Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}