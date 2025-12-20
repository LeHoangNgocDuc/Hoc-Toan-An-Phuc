import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Grade, Question, QuestionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINE_API_KEY });

const sanitizeString = (str: string): string => {
  if (!str) return "";
  return str
    // Remove environment tags which force display mode
    .replace(/\\begin\{equation\*?\}/g, '')
    .replace(/\\end\{equation\*?\}/g, '')
    .replace(/\\begin\{align\*?\}/g, '')
    .replace(/\\end\{align\*?\}/g, '')
    .replace(/\\begin\{gather\*?\}/g, '')
    .replace(/\\end\{gather\*?\}/g, '')
    // Normalize delimiters
    .replace(/\$\$/g, '$')       // Replace $$ with $
    .replace(/\\\[/g, '$')       // Replace \[ with $
    .replace(/\\\]/g, '$')       // Replace \] with $
    // Remove newlines
    .replace(/\\n/g, ' ')        // Replace escaped newlines
    .replace(/\n/g, ' ')         // Replace actual newlines
    .trim();
};

export const generateMathQuestions = async (
  grade: Grade,
  topic: string,
  difficulty: Difficulty,
  count: number,
  questionType: QuestionType | 'MIXED'
): Promise<Question[]> => {
  const model = "gemini-2.5-flash";

  let typeInstruction = "";
  if (questionType === QuestionType.MULTIPLE_CHOICE) {
    typeInstruction = "Tất cả câu hỏi phải là dạng TRẮC NGHIỆM 4 đáp án (A, B, C, D).";
  } else if (questionType === QuestionType.TRUE_FALSE) {
    typeInstruction = "Tất cả câu hỏi phải là dạng ĐÚNG/SAI với 4 mệnh đề (a, b, c, d).";
  } else {
    typeInstruction = "Kết hợp ngẫu nhiên giữa câu hỏi TRẮC NGHIỆM và câu hỏi ĐÚNG/SAI.";
  }

  const prompt = `
    Tạo bộ ${count} câu hỏi Toán lớp ${grade} (THCS Việt Nam).
    Chủ đề: ${topic}.
    Độ khó: ${difficulty}.
    ${typeInstruction}
    
    Yêu cầu ĐỊNH DẠNG (QUAN TRỌNG):
    1. Trả về JSON thuần túy.
    2. Cú pháp LaTeX cho TOÀN BỘ biểu thức toán.
    3. BẮT BUỘC dùng dấu $ đơn cho công thức (ví dụ: $x^2$). TUYỆT ĐỐI KHÔNG dùng $$ hoặc \\[ \\].
    4. KHÔNG được xuống dòng (\\n) trong chuỗi văn bản.
    
    Cấu trúc JSON cho từng loại:
    - Trắc nghiệm (MULTIPLE_CHOICE):
      {
        "type": "MULTIPLE_CHOICE",
        "questionText": "...",
        "options": ["...", "...", "...", "..."],
        "correctAnswerIndex": 0 (0-3),
        "explanation": "..."
      }
    - Đúng/Sai (TRUE_FALSE):
      {
        "type": "TRUE_FALSE",
        "questionText": "Cho biểu thức...",
        "propositions": ["Mệnh đề a", "Mệnh đề b", "Mệnh đề c", "Mệnh đề d"],
        "correctAnswersTF": [true, false, true, false],
        "explanation": "..."
      }
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: [QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE] },
              questionText: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
              propositions: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswersTF: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
              explanation: { type: Type.STRING },
            },
            required: ["type", "questionText", "explanation"],
          },
        },
      },
    });

    if (response.text) {
      const rawQuestions = JSON.parse(response.text) as Question[];
      
      const sanitizedQuestions = rawQuestions.map((q, index) => ({
        ...q,
        id: `q-${Date.now()}-${index}`,
        questionText: sanitizeString(q.questionText),
        explanation: sanitizeString(q.explanation),
        options: q.options ? q.options.map(opt => sanitizeString(opt)) : undefined,
        propositions: q.propositions ? q.propositions.map(prop => sanitizeString(prop)) : undefined
      }));

      return sanitizedQuestions.slice(0, count);
    }
    throw new Error("Không nhận được dữ liệu từ Gemini.");
  } catch (error) {
    console.error("Lỗi khi tạo câu hỏi:", error);
    throw error;
  }
};