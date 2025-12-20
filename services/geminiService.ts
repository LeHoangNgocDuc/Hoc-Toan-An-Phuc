import { GoogleGenerativeAI } from "@google/generative-ai";
import { Difficulty, Grade, Question, QuestionType } from "../types";

// Khởi tạo Gemini với Key của bạn (Đã điền sẵn Key từ tin nhắn trước để bạn chạy luôn)
const genAI = new GoogleGenerativeAI("AIzaSyCi5Yw7aoAhxUaZWRPgX8hnta0TOSBmEdY");

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
  
  // SỬA LỖI 1: Dùng model chuẩn "gemini-1.5-flash"
  // SỬA LỖI 2: Cấu hình responseMimeType là JSON để không bị lỗi cú pháp
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
    // SỬA LỖI 3: Gọi hàm generateContent đúng chuẩn SDK
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON từ kết quả trả về
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
    if (error.message && error.message.includes("429")) {
        alert("Hệ thống đang bận. Vui lòng đợi 30 giây!");
    }
    throw error;
  }
};
