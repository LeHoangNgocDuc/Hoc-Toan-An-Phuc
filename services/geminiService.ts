import { GoogleGenerativeAI } from "@google/generative-ai";
import { Difficulty, Grade, Question, QuestionType } from "../types";

// 1. Lấy Key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Khởi tạo (Nếu không có key thì để rỗng để bắt lỗi sau)
const genAI = new GoogleGenerativeAI(API_KEY || "NO_KEY");

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
  
  // KIỂM TRA KEY VÀ BÁO LỖI CỤ THỂ
  if (!API_KEY) {
    const errorMsg = "LỖI: Chưa tìm thấy API Key. Hãy kiểm tra tên biến VITE_GEMINI_API_KEY trên Vercel.";
    alert(errorMsg); // Hiện thông báo lên màn hình
    throw new Error(errorMsg);
  }

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest",
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
     
    Yêu cầu JSON format (No markdown):
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

    if (text.includes("```json")) {
        text = text.replace(/```json/g, "").replace(/```/g, "");
    } else if (text.includes("```")) {
        text = text.replace(/```/g, "");
    }
    
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
    // BẮT LỖI VÀ HIỆN THÔNG BÁO CHI TIẾT
    console.error("Lỗi:", error);
    
    let userMessage = "Có lỗi xảy ra: " + error.message;

    if (error.message.includes("429")) {
        userMessage = "LỖI 429: Hết lượt dùng miễn phí (Quota Exceeded). Hãy chờ 1 lát.";
    } else if (error.message.includes("API key not valid")) {
        userMessage = "LỖI KEY: API Key không đúng hoặc đã bị Google khóa.";
    } else if (error.message.includes("Failed to fetch")) {
        userMessage = "LỖI MẠNG: Kiểm tra kết nối internet.";
    }

    alert(userMessage); // Hiện thông báo lỗi cụ thể cho người dùng thấy
    throw error;
  }
};
