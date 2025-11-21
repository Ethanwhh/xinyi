'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Question {
  id: number;
  text: string;
  options: Array<{ value: number; label: string }>;
}

interface AssessmentDetail {
  id: number;
  scale_name: string;
  display_name: string;
  category: string;
  description: string;
  question_count: number;
  estimated_time: number;
  questions: Question[];
  icon: string;
}

export default function AssessmentTestPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = parseInt(params.id as string);

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchAssessmentDetail();
  }, [router, templateId]);

  const fetchAssessmentDetail = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `http://127.0.0.1:8000/api/assessments/${templateId}/template`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAssessment(data);
        // 初始化答案数组（全部为-1表示未作答）
        setAnswers(new Array(data.question_count).fill(-1));
      } else {
        alert('获取评估详情失败');
        router.push('/assessment');
      }
    } catch (error) {
      console.error('获取评估详情失败:', error);
      alert('网络错误，请重试');
      router.push('/assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < (assessment?.question_count || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const canSubmit = () => {
    // 检查是否所有题目都已作答
    return answers.every((answer) => answer !== -1);
  };

  const submitAssessment = async () => {
    if (!canSubmit()) {
      alert('请完成所有题目后再提交');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/assessments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          template_id: templateId,
          answers: answers,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // 跳转到结果页面
        router.push(`/assessment/result/${result.id}`);
      } else {
        const error = await response.json();
        alert(`提交失败：${error.detail || '未知错误'}`);
      }
    } catch (error) {
      console.error('提交评估失败:', error);
      alert('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.question_count) * 100;
  const answeredCount = answers.filter((a) => a !== -1).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航 */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('确定要退出评估吗？当前进度将不会保存。')) {
                router.push('/assessment');
              }
            }}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← 退出
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-800">{assessment.display_name}</h1>
            <p className="text-xs text-gray-500">
              已完成 {answeredCount}/{assessment.question_count} 题
            </p>
          </div>
          <div className="w-16" /> {/* 占位 */}
        </div>
      </nav>

      {/* 进度条 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="h-2 bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 问题卡片 */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 问题编号 */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-purple-600">
              第 {currentQuestionIndex + 1} / {assessment.question_count} 题
            </span>
            {answers[currentQuestionIndex] !== -1 && (
              <span className="text-sm text-green-600">✓ 已作答</span>
            )}
          </div>

          {/* 问题文本 */}
          <h2 className="text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
            {currentQuestion.text}
          </h2>

          {/* 选项列表 */}
          <div className="space-y-4 mb-8">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className={`w-full p-4 rounded-xl text-left font-medium transition-all duration-200 ${
                  answers[currentQuestionIndex] === option.value
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      answers[currentQuestionIndex] === option.value
                        ? 'border-white bg-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {answers[currentQuestionIndex] === option.value && (
                      <div className="w-3 h-3 rounded-full bg-purple-600" />
                    )}
                  </div>
                  <span>{option.label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between gap-4">
            <button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              上一题
            </button>

            {currentQuestionIndex === assessment.question_count - 1 ? (
              <button
                onClick={submitAssessment}
                disabled={!canSubmit() || submitting}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? '提交中...' : canSubmit() ? '提交评估' : `还有 ${assessment.question_count - answeredCount} 题未完成`}
              </button>
            ) : (
              <button
                onClick={goToNextQuestion}
                disabled={answers[currentQuestionIndex] === -1}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                下一题
              </button>
            )}
          </div>

          {/* 提示信息 */}
          {answers[currentQuestionIndex] === -1 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              请选择一个选项后继续
            </p>
          )}
        </div>

        {/* 题目导航 */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">题目导航</h3>
          <div className="grid grid-cols-10 gap-2">
            {assessment.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`aspect-square rounded-lg font-medium text-sm transition-all ${
                  index === currentQuestionIndex
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-110'
                    : answers[index] !== -1
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
