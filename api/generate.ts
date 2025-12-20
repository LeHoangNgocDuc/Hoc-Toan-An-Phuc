import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.7,
      },
    });

    const { prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // 🔥 BẮT BUỘC: làm sạch output
    text = text.replace(/```json|```/g, "").trim();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("❌ JSON parse failed. Raw text:", text);
      return res.status(500).json({
        error: "Gemini returned invalid JSON",
        raw: text,
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Gemini backend error:", error);
    return res.status(500).json({ error: "Gemini backend error" });
  }
}
