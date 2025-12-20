import { Difficulty, Grade, Question, QuestionType } from "../types";

/* =========================
   1. SANITIZE TEXT
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
   2. MAIN FUNCTION
========================= */
export const generateMathQuestions = async (
  grade: Grade,
  topic: string,
  difficulty: Difficulty,
  count: number,
  questionType: QuestionType | "MIXED"
): Promise<Question[]> => {

  /* =========================
     3. QUESTION TYPE RULE
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
     4. PROMPT
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
     5. CALL BACKEND API
  ========================= */
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status}`);
    }

    const rawQuestions = (await res.json()) as Question[];

    return rawQuestions.slice(0, count).map((q, index) => ({
      ...q,
      id: `q-${Date.now()}-${index}`,
      questionText: sanitizeString(q.questionText),
      explanation: sanitizeString(q.explanation),
      options: q.options?.map(sanitizeString),
      propositions: q.propositions?.map(sanitizeString),
    }));

  } catch (error: any) {
    console.error("❌ Backend Gemini Error:", error);

    let userMessage = "Có lỗi xảy ra khi tạo câu hỏi.";

    if (error.message?.includes("429")) {
      userMessage = "LỖI 429: Hết quota miễn phí. Vui lòng thử lại sau.";
    }

    alert(userMessage);
    throw error;
  }
};
