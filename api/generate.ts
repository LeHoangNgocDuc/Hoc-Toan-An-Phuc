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
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json(JSON.parse(text));
  } catch (error) {
    console.error("Gemini API error:", error);
    return res.status(500).json({ error: "Gemini backend error" });
  }
}
