import { GoogleGenerativeAI } from "@google/generative-ai";
import { Difficulty, Grade, Question, QuestionType } from "../types";

// 1. Lấy Key từ biến môi trường (An toàn)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Kiểm tra xem đã có Key chưa
if (!API_KEY) {
  console.error("❌ LỖI: Chưa cấu hình VITE_GEMINI_API_KEY trong file .env hoặc trên Vercel!");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

// Hàm làm sạch chuỗi LaTeX/Văn bản
const sanitizeString = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/\\begin\{equation\*?\}/g, '')
    .replace(/\\end\{equation\*?\}/g, '')
    .replace(/\\begin\{align\*?\}/g, '')
    .replace(/\\end\{align\*?\}/g, '')
    .replace(/\\begin\{gather\*?\}/g, '')
    .replace(/\\end\{gather\*?\}/g, '')
    .replace(/\$\$/g, '$')        
    .replace(/\\\[/g, '$')        
    .replace(/\\\]/g, '$')        
    .replace(/\\n/g, ' ')        
    .replace(/\n/g, ' ')          
    .trim();
};

export const generateMathQuestions = async (
  grade: Grade,
  topic: string,
  difficulty: Difficulty,
  count: number,
  questionType: QuestionType | 'MIXED'
): Promise<Question[]> => {
  
  if (!API_KEY) {
    throw new Error("Chưa có khóa API. Vui lòng kiểm tra cài đặt.");
  }

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7 
    }
  });

  let typeInstruction = "";
  if (questionType === QuestionType.MULTIPLE_CHOICE) {
    typeInstruction = "Tất cả câu hỏi phải là dạng TRẮC NGHIỆM 4 đáp án (A, B, C, D).";
  } else if (questionType === QuestionType.TRUE_FALSE) {
    typeInstruction = "Tất cả câu hỏi phải là dạng ĐÚNG/SAI với 4 mệnh đề (a, b, c, d).";
  } else {
    typeInstruction = "Kết hợp ngẫu nhiên giữa câu hỏi TRẮC NGHIỆM và câu hỏi ĐÚNG/SAI.";
  }

  const prompt = `
    Bạn là giáo viên Toán THCS. Hãy tạo bộ ${count} câu hỏi Toán lớp ${grade}.
    Chủ đề: ${topic}.
    Độ khó: ${difficulty}.
    ${typeInstruction}
     
    Yêu cầu ĐỊNH DẠNG (QUAN TRỌNG):
    1. Trả về JSON thuần túy (Array of Objects).
    2. Cú pháp LaTeX cho TOÀN BỘ biểu thức toán.
    3. BẮT BUỘC dùng dấu $ đơn cho công thức (ví dụ: $x^2$). TUYỆT ĐỐI KHÔNG dùng $$ hoặc \\[ \\].
    4. KHÔNG được xuống dòng (\\n) trong chuỗi văn bản.
     
    Cấu trúc JSON mong muốn:
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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 2. Xử lý trường hợp AI trả về markdown code block (```json ... ```)
    if (text.includes("```json")) {
        text = text.replace(/```json/g, "").replace(/```/g, "");
    } else if (text.includes("```")) {
        text = text.replace(/```/g, "");
    }
    
    // Parse JSON
    const rawQuestions = JSON.parse(text) as Question[];
      
    const sanitizedQuestions = rawQuestions.map((q, index) => ({
      ...q,
      id: `q-${Date.now()}-${index}`,
      questionText: sanitizeString(q.questionText),
      explanation: sanitizeString(q.explanation),
      options: q.options ? q.options.map(opt => sanitizeString(opt)) : undefined,
      propositions: q.propositions ? q.propositions.map(prop => sanitizeString(prop)) : undefined
    }));

    return sanitizedQuestions.slice(0, count);

  } catch (error: any) {
    console.error("Lỗi khi tạo câu hỏi:", error);
    // Xử lý lỗi 503 (Server quá tải) hoặc 429 (Hết lượt)
    if (error.message && (error.message.includes("503") || error.message.includes("429"))) {
        throw new Error("Hệ thống AI đang bận. Vui lòng thử lại sau 30 giây.");
    }
    throw error;
  }
};
