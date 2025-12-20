import { GoogleGenerativeAI } from "@google/generative-ai";
import { Difficulty, Grade, Question, QuestionType } from "../types";

/* =========================
   1. API KEY
========================= */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing VITE_GEMINI_API_KEY");
}

const genAI = new GoogleGenerativeAI(API_KEY || "NO_KEY");

/* =========================
   2. SANITIZE TEX
========================= */
const sanitizeString = (str?: string): string => {
  if (!str) return "";
  return str
    .replace(/\\begin\{equation\*?\}/g, "")
    .replace(/\\end\{equation\*?\}/g, "")
    .replace(/\\begin\{align\*?\}/g, "")
    .replace(/\\end\{align\*?\}/g, "")
    .replace(/\\begin\{gather\*?\}/g, "")
    .replace(/\\end\{gather\*?\}/g, "")
    .replace(/\$\$/g, "$")
    .replace(/\\\[/g, "$")
    .replace(/\\\]/g, "$")
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .trim();
};

/* =========================
   3. MAIN FUNCTION
========================= */
export const generateMathQuestions = async (
  grade: Grade,
  topic: string,
  difficulty: Difficulty,
  count: number,
  questionType: QuestionType | "MIXED"
): Promise<Question[]> => {

  if (!API_KEY) {
    const msg =
      "LỖI: Không tìm thấy API Key. Hãy kiểm tra biến VITE_GEMINI_API_KEY trên Vercel.";
    alert(msg);
    throw new Error(msg);
  }

  /* =========================
     4. MODEL (ỔN ĐỊNH)
  ========================= */
  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  /* =========================
     5. QUESTION TYPE RULE
  ========================= */
  let typeInstruction = "";
  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      typeInstruction =
        "Tất cả câu hỏi phải là dạng TRẮC NGHIỆM 4 đáp án (A, B, C, D).";
      break;
    case QuestionType.TRUE_FALSE:
      typeInstruction =
        "Tất cả câu hỏi phải là dạng ĐÚNG/SAI với 4 mệnh đề (a, b, c, d).";
      break;
    default:
      typeInstruction =
        "Kết hợp ngẫu nhiên giữa câu hỏi TRẮC NGHIỆM và câu hỏi ĐÚNG/SAI.";
  }

  /* =========================
     6. PROMPT
  ========================= */
  const prompt = `
Bạn là giáo viên Toán THCS.

Hãy tạo ${count} câu hỏi Toán lớp ${grade}.
Chủ đề: ${topic}.
Độ khó: ${difficulty}.
${typeInstruction}

Yêu cầu:
- Chỉ trả về JSON thuần
- Không markdown
- Không giải thích ngoài JSON

Định dạng:
[
  {
    "type": "MULTIPLE_CHOICE",
    "questionText": "...",
    "options": ["A", "B", "C", "D"],
    "correctAnswerIndex": 0,
    "explanation": "..."
  },
  {
    "type": "TRUE_FALSE",
    "questionText": "...",
    "propositions": ["a", "b", "c", "d"],
    "correctAnswersTF": [true, false, true, false],
    "explanation": "..."
  }
]
`;

  /* =========================
     7. GENERATE
  ========================= */
  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Remove code fences nếu model trả về
    text = text.replace(/```json|```/g, "").trim();

    const rawQuestions = JSON.parse(text) as Question[];

    return rawQuestions.slice(0, count).map((q, index) => ({
      ...q,
      id: `q-${Date.now()}-${index}`,
      questionText: sanitizeString(q.questionText),
      explanation: sanitizeString(q.explanation),
      options: q.options?.map(sanitizeString),
      propositions: q.propositions?.map(sanitizeString),
    }));

  } catch (error: any) {
    console.error("❌ Gemini Error:", error);

    let userMessage = "Có lỗi xảy ra khi tạo câu hỏi.";

    if (error.message?.includes("429")) {
      userMessage = "LỖI 429: Hết quota miễn phí. Vui lòng thử lại sau.";
    } else if (error.message?.includes("API key not valid")) {
      userMessage = "LỖI: API Key không hợp lệ hoặc đã bị khóa.";
    } else if (error.message?.includes("404")) {
      userMessage = "LỖI: Model Gemini không khả dụng.";
    }

    alert(userMessage);
    throw error;
  }
};
