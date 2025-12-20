import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-teal-800">
      <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-6"></div>
      <h2 className="text-xl font-bold mb-2">Đang khởi tạo đề thi...</h2>
      <p className="text-teal-600">Gemini AI đang soạn thảo các câu hỏi Toán học dành cho bạn.</p>
      <p className="text-sm text-teal-500 mt-2">Vui lòng đợi trong giây lát.</p>
    </div>
  );
};

export default LoadingScreen;
