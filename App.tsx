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
     START QUIZ (SAFE)
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

      // 🔒 GUARD 1: không cho vào quiz nếu rỗng
      if (!Array.isArray(questions) || questions.length === 0) {
        alert("Không tạo được câu hỏi. Vui lòng thử lại.");
        setView('setup');
        return;
      }

      const initialAnswers = questions.map(q =>
        q.type === QuestionType.TRUE_FALSE
          ? [undefined, undefined, undefined, undefined]
          : -1
      );

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
    } catch {
      alert("Có lỗi xảy ra khi tạo câu hỏi.");
      setView('setup');
    }
  };

  /* =========================
     ANSWER HANDLERS
  ========================= */
  const handleMCSelect = (optionIndex: number) => {
    if (quizState.isComplete) return;
    setQuizState(prev => {
      const answers = [...prev.userAnswers];
      answers[prev.currentQuestionIndex] = optionIndex;
      return { ...prev, userAnswers: answers };
    });
  };

  const handleTFSelect = (propIndex: number, value: boolean) => {
    if (quizState.isComplete) return;
    setQuizState(prev => {
      const answers = [...prev.userAnswers];
      const current = (answers[prev.currentQuestionIndex] as boolean[]) ?? [undefined, undefined, undefined, undefined];
      const updated = [...current];
      updated[propIndex] = value;
      answers[prev.currentQuestionIndex] = updated;
      return { ...prev, userAnswers: answers };
    });
  };

  const handleNextQuestion = () => {
    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
      setQuizState(p => ({ ...p, currentQuestionIndex: p.currentQuestionIndex + 1 }));
    } else {
      finishQuiz('normal');
    }
  };

  const handlePrevQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(p => ({ ...p, currentQuestionIndex: p.currentQuestionIndex - 1 }));
    }
  };

  /* =========================
     FINISH QUIZ (SAFE)
  ========================= */
  const finishQuiz = useCallback((reason: 'normal' | 'cheat' = 'normal') => {
    setQuizState(prev => {
      // 🔒 GUARD 2: tránh chia cho 0
      if (!prev.questions || prev.questions.length === 0) return prev;

      let totalPoints = 0;
      const maxPoints = prev.questions.length;

      prev.questions.forEach((q, idx) => {
        const ans = prev.userAnswers[idx];
        if (q.type === QuestionType.MULTIPLE_CHOICE) {
          if (ans === q.correctAnswerIndex) totalPoints += 1;
        } else if (q.type === QuestionType.TRUE_FALSE) {
          const userTF = ans as boolean[];
          const correctTF = q.correctAnswersTF || [];
          let correct = 0;
          userTF?.forEach((v, i) => { if (v === correctTF[i]) correct++; });
          totalPoints += correct * 0.25;
        }
      });

      return {
        ...prev,
        isComplete: true,
        score: +((totalPoints / maxPoints) * 10).toFixed(2),
        submissionReason: reason
      };
    });
    setView('summary');
  }, []);

  const resetApp = () => setView('setup');

  /* =========================
     CHEAT & TIMER
  ========================= */
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && view === 'quiz') finishQuiz('cheat');
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [view, finishQuiz]);

  useEffect(() => {
    if (view === 'quiz' && !quizState.isComplete) {
      timerRef.current = window.setInterval(() => setElapsedTime(t => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [view, quizState.isComplete]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  /* =========================
     RENDER QUIZ (SAFE)
  ========================= */
  const renderQuiz = () => {
    // 🔒 GUARD 3: chống trắng màn
    if (!quizState.questions || quizState.questions.length === 0) {
      return (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-xl text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="font-bold text-red-600">Không có câu hỏi để hiển thị.</p>
          <button onClick={resetApp} className="mt-4 px-6 py-3 bg-teal-600 text-white rounded-lg">
            Quay lại
          </button>
        </div>
      );
    }

    const currentQ = quizState.questions[quizState.currentQuestionIndex];
    const isLast = quizState.currentQuestionIndex === quizState.questions.length - 1;

    const answeredCount = quizState.userAnswers.filter(a =>
      Array.isArray(a) ? a.some(v => v !== undefined) : a !== -1
    ).length;
    const progress = (answeredCount / quizState.questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center sticky top-4 z-10 border-l-4 border-teal-500">
          <div>
            <div className="text-xs font-bold text-gray-400">THỜI GIAN</div>
            <div className="text-xl font-mono text-teal-700 font-bold">{formatTime(elapsedTime)}</div>
          </div>
          <span className="text-sm font-medium text-gray-600">
            Câu {quizState.currentQuestionIndex + 1}/{quizState.questions.length}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
          <div className="bg-teal-600 h-2.5 rounded-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg mb-8">
          <MathRenderer content={currentQ.questionText} className="text-xl font-medium" />
          <div className="mt-6">
            {currentQ.type === QuestionType.MULTIPLE_CHOICE
              ? currentQ.options?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleMCSelect(i)}
                    className="block w-full text-left p-4 border rounded-lg mb-2"
                  >
                    {String.fromCharCode(65 + i)}. <MathRenderer content={opt} />
                  </button>
                ))
              : currentQ.propositions?.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 mb-2">
                    <span>{String.fromCharCode(97 + i)})</span>
                    <MathRenderer content={p} />
                    <button onClick={() => handleTFSelect(i, true)}><CheckSquare /></button>
                    <button onClick={() => handleTFSelect(i, false)}><XCircle /></button>
                  </div>
                ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={handlePrevQuestion} disabled={quizState.currentQuestionIndex === 0}>
            <ChevronLeft /> Trước
          </button>
          {isLast ? (
            <button onClick={() => finishQuiz('normal')}>
              Nộp bài <CheckCircle />
            </button>
          ) : (
            <button onClick={handleNextQuestion}>
              Tiếp <ChevronRight />
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
          <button onClick={resetApp} className="mt-4 flex items-center gap-2 mx-auto">
            <RefreshCw /> Làm lại
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
