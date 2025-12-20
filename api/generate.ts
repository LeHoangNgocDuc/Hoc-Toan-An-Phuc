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
        temperature: 0.5,
      },
    });

    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // 🔒 ÉP TRẢ JSON NGHIÊM NGẶT
    const strictPrompt = `
${prompt}

QUAN TRỌNG:
- Chỉ trả về JSON hợp lệ
- Không markdown
- Không văn bản ngoài JSON
- Nếu không chắc, trả về mảng rỗng: []
`;

    const result = await model.generateContent(strictPrompt);
    let text = result.response.text();

    // Làm sạch cơ bản
    text = text.replace(/```json|```/g, "").trim();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // 🔥 FALLBACK AN TOÀN
      return res.status(200).json([]);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Gemini backend error:", error);
    return res.status(500).json([]);
  }
}
