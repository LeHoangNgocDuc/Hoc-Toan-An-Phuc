import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateMathQuestions } from './services/geminiService';
import { Difficulty, Grade, Question, QuizConfig, QuizState, QuestionType } from './types';
import MathRenderer from './components/MathRenderer';
import LoadingScreen from './components/LoadingScreen';
import {
  BookOpen, CheckCircle, XCircle, RefreshCw,
  ChevronRight, ChevronLeft, AlertOctagon, CheckSquare
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

    const questions = await generateMathQuestions(
      config.grade,
      config.topic,
      config.difficulty,
      config.questionCount,
      config.questionType
    );

    // 🔒 GUARD: KHÔNG CÓ CÂU HỎI → QUAY LẠI SETUP
    if (!Array.isArray(questions) || questions.length === 0) {
      alert("Không tạo được câu hỏi. Vui lòng bấm lại.");
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
  };

  /* =========================
     FINISH QUIZ
  ========================= */
  const finishQuiz = useCallback((reason: 'normal' | 'cheat' = 'normal') => {
    setQuizState(prev => {
      if (prev.questions.length === 0) return prev;

      let total = 0;
      prev.questions.forEach((q, i) => {
        const ans = prev.userAnswers[i];
        if (q.type === QuestionType.MULTIPLE_CHOICE && ans === q.correctAnswerIndex) {
          total += 1;
        }
        if (q.type === QuestionType.TRUE_FALSE && Array.isArray(ans)) {
          ans.forEach((v, k) => {
            if (v === q.correctAnswersTF?.[k]) total += 0.25;
          });
        }
      });

      return {
        ...prev,
        isComplete: true,
        score: +(total / prev.questions.length * 10).toFixed(2),
        submissionReason: reason
      };
    });
    setView('summary');
  }, []);

  /* =========================
     TIMER
  ========================= */
  useEffect(() => {
    if (view === 'quiz') {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view]);

  /* =========================
     RENDER QUIZ (SAFE)
  ========================= */
  const renderQuiz = () => {
    // 🔒 GUARD CHỐNG TRẮNG MÀN
    if (quizState.questions.length === 0) {
      return (
        <div className="text-center p-8 bg-white rounded-xl">
          <p className="text-red-600 font-bold">
            Không có câu hỏi để hiển thị.
          </p>
          <button
            onClick={() => setView('setup')}
            className="mt-4 px-6 py-3 bg-teal-600 text-white rounded-lg"
          >
            Quay lại
          </button>
        </div>
      );
    }

    const currentQ = quizState.questions[quizState.currentQuestionIndex];

    return (
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl">
        <MathRenderer content={currentQ.questionText} className="text-xl mb-6" />
        {currentQ.type === QuestionType.MULTIPLE_CHOICE ? (
          currentQ.options?.map((o, i) => (
            <button
              key={i}
              className="block w-full text-left border p-3 rounded mb-2"
              onClick={() => {
                const ua = [...quizState.userAnswers];
                ua[quizState.currentQuestionIndex] = i;
                setQuizState(s => ({ ...s, userAnswers: ua }));
              }}
            >
              {String.fromCharCode(65 + i)}. <MathRenderer content={o} />
            </button>
          ))
        ) : (
          <p>Đúng / Sai</p>
        )}

        <div className="flex justify-between mt-6">
          <button
            disabled={quizState.currentQuestionIndex === 0}
            onClick={() =>
              setQuizState(s => ({
                ...s,
                currentQuestionIndex: s.currentQuestionIndex - 1
              }))
            }
          >
            <ChevronLeft /> Trước
          </button>

          {quizState.currentQuestionIndex === quizState.questions.length - 1 ? (
            <button onClick={() => finishQuiz()}>
              Nộp bài <CheckCircle />
            </button>
          ) : (
            <button
              onClick={() =>
                setQuizState(s => ({
                  ...s,
                  currentQuestionIndex: s.currentQuestionIndex + 1
                }))
              }
            >
              Tiếp <ChevronRight />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-teal-50 p-6">
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
          <button onClick={() => setView('setup')} className="mt-4">
            <RefreshCw /> Làm lại
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
