import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateMathQuestions } from './services/geminiService';
import { Difficulty, Grade, Question, QuizConfig, QuizState, QuestionType } from './types';
import MathRenderer from './components/MathRenderer';
import LoadingScreen from './components/LoadingScreen';
import { 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Award,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  AlertOctagon,
  CheckSquare
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'setup' | 'loading' | 'quiz' | 'summary'>('setup');
  
  const [config, setConfig] = useState<QuizConfig>({
    grade: Grade.NINE,
    topic: 'Phương trình bậc hai',
    difficulty: Difficulty.MEDIUM,
    questionCount: 5,
    questionType: 'MIXED'
  });

  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    userAnswers: [],
    currentQuestionIndex: 0,
    isComplete: false,
    score: 0,
    warnings: 0,
    startTime: 0,
    submissionReason: 'normal'
  });
  
  const timerRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  /* =========================
     START QUIZ
  ========================= */
  const handleStartQuiz = async () => {
    setView('loading');

    try {
      const questions = await generateMathQuestions(
        config.grade,
        config.topic,
        config.difficulty,
        config.questionCount,
        config.questionType
      );

      // ✅ FIX 1: KHÔNG CHO VÀO QUIZ NẾU KHÔNG CÓ CÂU HỎI
      if (!Array.isArray(questions) || questions.length === 0) {
        alert("Không tạo được câu hỏi. Vui lòng bấm lại.");
        setView('setup');
        return;
      }

      const initialAnswers = questions.map(q => {
        if (q.type === QuestionType.TRUE_FALSE) {
          return [undefined, undefined, undefined, undefined] as any;
        }
        return -1; 
      });

      setQuizState({
        questions,
        userAnswers: initialAnswers,
        currentQuestionIndex: 0,
        isComplete: false,
        score: 0,
        warnings: 0,
        startTime: Date.now(),
        submissionReason: 'normal'
      });

      setElapsedTime(0);
      setView('quiz');

    } catch (error) {
      alert("Có lỗi xảy ra khi tạo câu hỏi. Vui lòng thử lại.");
      setView('setup');
    }
  };

  const handleMCSelect = (optionIndex: number) => {
    if (quizState.isComplete) return;
    setQuizState(prev => {
      const newAnswers = [...prev.userAnswers];
      newAnswers[prev.currentQuestionIndex] = optionIndex;
      return { ...prev, userAnswers: newAnswers };
    });
  };

  const handleTFSelect = (propIndex: number, value: boolean) => {
    if (quizState.isComplete) return;
    setQuizState(prev => {
      const newAnswers = [...prev.userAnswers];
      const currentAns = newAnswers[prev.currentQuestionIndex] as boolean[] || [undefined, undefined, undefined, undefined];
      const updatedTF = [...currentAns];
      updatedTF[propIndex] = value;
      newAnswers[prev.currentQuestionIndex] = updatedTF;
      return { ...prev, userAnswers: newAnswers };
    });
  };

  const handleNextQuestion = () => {
    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      finishQuiz('normal');
    }
  };

  const handlePrevQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }));
    }
  };

  const finishQuiz = useCallback((reason: 'normal' | 'cheat' = 'normal') => {
    setQuizState(prev => {
      // ✅ FIX 2: GUARD – TRÁNH CHIA CHO 0
      if (prev.questions.length === 0) return prev;

      let totalPoints = 0;
      const maxPossiblePoints = prev.questions.length; 

      prev.questions.forEach((q, idx) => {
        const ans = prev.userAnswers[idx];
        if (q.type === QuestionType.MULTIPLE_CHOICE) {
          if (ans === q.correctAnswerIndex) {
            totalPoints += 1;
          }
        } else if (q.type === QuestionType.TRUE_FALSE) {
          const userTF = ans as boolean[];
          const correctTF = q.correctAnswersTF || [];
          let correctProps = 0;
          if (Array.isArray(userTF)) {
             userTF.forEach((val, i) => {
               if (val === correctTF[i]) correctProps++;
             });
          }
          totalPoints += (correctProps * 0.25);
        }
      });
      
      const finalScore = (totalPoints / maxPossiblePoints) * 10;

      return {
        ...prev,
        isComplete: true,
        score: parseFloat(finalScore.toFixed(2)),
        submissionReason: reason
      };
    });
    setView('summary');
  }, []);

  const resetApp = () => {
    setView('setup');
  };

  /* =========================
     TIMER & CHEAT
  ========================= */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && view === 'quiz') {
        finishQuiz('cheat');
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [view, finishQuiz]);

  useEffect(() => {
    if (view === 'quiz' && !quizState.isComplete) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [view, quizState.isComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  /* =========================
     RENDER QUIZ (SAFE)
  ========================= */
  const renderQuiz = () => {
    // ✅ FIX 3: GUARD CHỐNG TRẮNG MÀN
    if (quizState.questions.length === 0) {
      return (
        <div className="max-w-xl mx-auto bg-white p-6 rounded-xl text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="font-bold text-red-600">Không có câu hỏi để hiển thị.</p>
          <button
            onClick={resetApp}
            className="mt-4 px-6 py-3 bg-teal-600 text-white rounded-lg"
          >
            Quay lại
          </button>
        </div>
      );
    }

    /* === PHẦN CŨ CỦA BẠN – GIỮ NGUYÊN === */
    const currentQ = quizState.questions[quizState.currentQuestionIndex];
    const isLast = quizState.currentQuestionIndex === quizState.questions.length - 1;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-8">
          <MathRenderer content={currentQ.questionText} className="text-xl font-medium" />
        </div>

        {currentQ.type === QuestionType.MULTIPLE_CHOICE && (
          <div className="space-y-3">
            {currentQ.options?.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleMCSelect(idx)}
                className="w-full p-4 border rounded-lg text-left"
              >
                {String.fromCharCode(65 + idx)}. <MathRenderer content={opt} />
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevQuestion}
            disabled={quizState.currentQuestionIndex === 0}
          >
            <ChevronLeft /> Trước
          </button>

          {isLast ? (
            <button onClick={() => finishQuiz('normal')}>
              Nộp bài <CheckCircle />
            </button>
          ) : (
            <button onClick={handleNextQuestion}>
              Tiếp theo <ChevronRight />
            </button>
          )}
        </div>
      </div>
    );
  };

  /* =========================
     MAIN RENDER
  ========================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 py-12 px-4">
      {view === 'setup' && (
        <button
          onClick={handleStartQuiz}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg"
        >
          Bắt đầu làm bài
        </button>
      )}
      {view === 'loading' && <LoadingScreen />}
      {view === 'quiz' && renderQuiz()}
      {view === 'summary' && (
        <div className="text-center">
          <h1 className="text-3xl font-bold">{quizState.score}/10</h1>
          <button onClick={resetApp} className="mt-4">
            <RefreshCw /> Làm lại
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
