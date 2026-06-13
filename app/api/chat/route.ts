import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY; 
    
    if (!apiKey) {
      return NextResponse.json(
        { text: "🚨 [SYS_ERROR]: ยังไม่ได้ติดตั้ง GEMINI_API_KEY ในไฟล์ .env.local ครับบอส!" },
        { status: 500 }
      );
    }

    const systemPersona = "You are the Core Intelligence Matrix of NONTHAWAT.TECH. Keep your tone highly advanced, futuristic, and slightly cyberpunk, but always precise and deeply helpful. Use professional terminal telemetry terminology when appropriate. Respond in the language requested by the user.";
    const combinedPayload = `${systemPersona}\n\n[USER_COMMAND_VECTOR]: ${prompt}`;

    // 🛰️ สลับกลับมาใช้ตัวแรงสุดที่ระบบของบอสรองรับ: gemini-2.0-flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            role: 'user',
            parts: [{ text: combinedPayload }] 
          }]
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ 
        text: `🚨 [GEMINI_API_REJECTION]: ${data.error.message} (${data.error.status})` 
      });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Vector telemetry timed out. Empty stream received.";
    return NextResponse.json({ text: aiText });

  } catch (error) {
    console.error("AI Core Link Error:", error);
    return NextResponse.json(
      { text: "💥 [CRITICAL_ERROR]: การเชื่อมต่อโครงข่ายระบบหลักขัดข้อง" },
      { status: 500 }
    );
  }
}