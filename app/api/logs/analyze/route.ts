import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { errorCode, errorMessage, clientSystem } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 500 });

    // คุมบังเหียน AI: สั่งให้คัดแยกวิเคราะห์ทั้งระบบ Error และรายงานปัญหาของผู้ใช้ (USER_REPORT)
    const systemPersona = `You are the Core Automated DevOps & QA Intelligence for NONTHAWAT.TECH.
    If the data incoming starts with 'USER_REPORT:', this is a direct manual issue reported by a customer.
    Categorize it as 'รายงานปัญหาจากผู้ใช้งาน'.
    Analyze what the user encountered, determine the severity, and write a precise 2-sentence solution or action item in Thai.
    Keep the formatting clean like advanced cyberpunk telemetry data.`;
    
    const combinedPayload = `${systemPersona}\n\n[INCOMING_ERROR_DATA]:\nSystem: ${clientSystem}\nCode: ${errorCode}\nMessage: ${errorMessage}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: combinedPayload }] }]
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ 
        success: false, 
        alertSummary: `🚨 [ระบบตรวจจับภัยขัดข้อง]: ${data.error.message}` 
      });
    }

    const bugAnalysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to parse error vector.";

    return NextResponse.json({ 
      success: true, 
      alertSummary: bugAnalysis 
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal Monitoring Error" }, { status: 500 });
  }
}