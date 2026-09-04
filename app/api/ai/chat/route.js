import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/aiService";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "minimax/minimax-m3:free";

export async function POST(req) {
  try {
    const body = await req.json();
    const { messages = [], storeContext = null } = body;

    // Read API key directly from environment (.env.local / process.env)
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "لم يتم ضبط OPENROUTER_API_KEY في ملف .env.local. يرجى فتح ملف .env.local وإضافة مفتاح OpenRouter الخاص بك ثم إعادة تشغيل المشروع."
        },
        { status: 400 }
      );
    }

    // Build the system instructions message with the store's real-time snapshot
    const systemInstruction = buildSystemPrompt(storeContext || {});

    // Prepare full messages payload
    const formattedMessages = [
      { role: "system", content: systemInstruction },
      ...messages.map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      }))
    ];

    // Call OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Nelly Cosmetics Store Advisor"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 3500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = {};
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {}

      const errorMsg = errorJson?.error?.message || errorJson?.message || errorText;
      console.error("OpenRouter API Error:", response.status, errorMsg);

      return NextResponse.json(
        { 
          error: `خطأ من مزود OpenRouter (${response.status}): ${errorMsg || "تعذر إكمال الرد، يرجى التحقق من صحة مفتاح API ورصيد الحساب."}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "عذراً، لم يتم استلام رد من النموذج.";

    return NextResponse.json({
      content: aiMessage,
      model: DEFAULT_MODEL,
      usage: data.usage || null
    });
  } catch (error) {
    console.error("AI Chat API Route error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ غير متوقع أثناء معالجة طلب الذكاء الاصطناعي." },
      { status: 500 }
    );
  }
}
