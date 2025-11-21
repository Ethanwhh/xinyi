'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AssessmentTemplate {
  id: number;
  scale_name: string;
  display_name: string;
  category: string;
  description: string;
  question_count: number;
  estimated_time: number;
  icon: string;
  last_completed: string | null;
}

const CATEGORY_INFO: Record<string, { name: string; color: string; emoji: string }> = {
  depression: { name: '抑郁评估', color: 'blue', emoji: '😔' },
  anxiety: { name: '焦虑评估', color: 'purple', emoji: '😰' },
  stress: { name: '压力评估', color: 'orange', emoji: '😫' },
  sleep: { name: '睡眠评估', color: 'indigo', emoji: '😴' },
  resilience: { name: '心理韧性', color: 'pink', emoji: '💪' },
  social: { name: '社交焦虑', color: 'rose', emoji: '😓' },
};

export default function AssessmentPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchAssessments();
  }, [router, selectedCategory]);

  const fetchAssessments = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const url = selectedCategory
        ? `http://127.0.0.1:8000/api/assessments/list?category=${selectedCategory}`
        : 'http://127.0.0.1:8000/api/assessments/list';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssessments(data);
      } else {
        alert('获取评估列表失败');
      }
    } catch (error) {
      console.error('获取评估列表失败:', error);
      alert('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = (id: number) => {
    router.push(`/assessment/${id}`);
  };

  const categories = Object.keys(CATEGORY_INFO);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航 */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← 返回
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                心理评估
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push('/assessment/history')}
            className="px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            评估历史
          </button>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 介绍卡片 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">专业心理评估系统</h2>
          <p className="text-gray-600 leading-relaxed">
            通过科学的心理量表，了解您的心理健康状况。所有评估结果仅供参考，不能替代专业诊断。
            评估数据将安全地保存在本地，仅您本人可见。
          </p>
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {CATEGORY_INFO[category].emoji} {CATEGORY_INFO[category].name}
            </button>
          ))}
        </div>

        {/* 评估卡片列表 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-600">暂无评估量表</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assessments.map((assessment) => {
              const categoryInfo = CATEGORY_INFO[assessment.category];
              return (
                <div
                  key={assessment.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col"
                  onClick={() => startAssessment(assessment.id)}
                >
                  {/* 卡片头部 */}
                  <div 
                    className="p-6 text-white"
                    style={{
                      background: assessment.category === 'depression' 
                        ? 'linear-gradient(to right, rgb(59, 130, 246), rgb(37, 99, 235))'
                        : assessment.category === 'anxiety'
                        ? 'linear-gradient(to right, rgb(168, 85, 247), rgb(126, 34, 206))'
                        : assessment.category === 'stress'
                        ? 'linear-gradient(to right, rgb(249, 115, 22), rgb(234, 88, 12))'
                        : assessment.category === 'sleep'
                        ? 'linear-gradient(to right, rgb(99, 102, 241), rgb(79, 70, 229))'
                        : assessment.category === 'resilience'
                        ? 'linear-gradient(to right, rgb(236, 72, 153), rgb(219, 39, 119))'
                        : assessment.category === 'social'
                        ? 'linear-gradient(to right, rgb(244, 63, 94), rgb(225, 29, 72))'
                        : 'linear-gradient(to right, rgb(168, 85, 247), rgb(126, 34, 206))'
                    }}
                  >
                    <div className="text-5xl mb-3">{assessment.icon}</div>
                    <h3 className="text-xl font-bold mb-2">{assessment.display_name}</h3>
                    <div className="flex items-center gap-4 text-sm opacity-90">
                      <span>📝 {assessment.question_count} 题</span>
                      <span>⏱️ {assessment.estimated_time} 分钟</span>
                    </div>
                  </div>

                  {/* 卡片内容 */}
                  <div className="p-6 flex flex-col flex-grow">
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-grow">
                      {assessment.description}
                    </p>

                    {/* 最后完成时间 */}
                    {assessment.last_completed && (
                      <div className="text-xs text-gray-500 mb-4">
                        上次完成：{new Date(assessment.last_completed).toLocaleDateString('zh-CN')}
                      </div>
                    )}

                    {/* 开始按钮 */}
                    <button
                      className="w-full py-3 rounded-xl font-semibold text-white hover:shadow-lg transform group-hover:scale-105 transition-all duration-200"
                      style={{
                        background: assessment.category === 'depression' 
                          ? 'linear-gradient(to right, rgb(59, 130, 246), rgb(37, 99, 235))'
                          : assessment.category === 'anxiety'
                          ? 'linear-gradient(to right, rgb(168, 85, 247), rgb(126, 34, 206))'
                          : assessment.category === 'stress'
                          ? 'linear-gradient(to right, rgb(249, 115, 22), rgb(234, 88, 12))'
                          : assessment.category === 'sleep'
                          ? 'linear-gradient(to right, rgb(99, 102, 241), rgb(79, 70, 229))'
                          : assessment.category === 'resilience'
                          ? 'linear-gradient(to right, rgb(236, 72, 153), rgb(219, 39, 119))'
                          : assessment.category === 'social'
                          ? 'linear-gradient(to right, rgb(244, 63, 94), rgb(225, 29, 72))'
                          : 'linear-gradient(to right, rgb(168, 85, 247), rgb(126, 34, 206))'
                      }}
                    >
                      {assessment.last_completed ? '再次评估' : '开始评估'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
