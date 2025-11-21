'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Training {
  id: number;
  training_type: string;
  training_name: string;
  description: string;
  duration: number;
  frequency: string;
  difficulty_level: string;
  icon: string;
  completed_count: number;
}

const TRAINING_TYPES: Record<string, { name: string; color: string; emoji: string; gradient: string }> = {
  breathing: { 
    name: '呼吸训练', 
    color: 'blue', 
    emoji: '🫑',
    gradient: 'linear-gradient(to right, rgb(59, 130, 246), rgb(37, 99, 235))'
  },
  muscle_relaxation: { 
    name: '肌肉放松', 
    color: 'green', 
    emoji: '💪',
    gradient: 'linear-gradient(to right, rgb(34, 197, 94), rgb(22, 163, 74))'
  },
  mindfulness: { 
    name: '正念冥想', 
    color: 'purple', 
    emoji: '🧘',
    gradient: 'linear-gradient(to right, rgb(168, 85, 247), rgb(126, 34, 206))'
  },
  cognitive: { 
    name: '认知重构', 
    color: 'orange', 
    emoji: '💭',
    gradient: 'linear-gradient(to right, rgb(249, 115, 22), rgb(234, 88, 12))'
  },
  emotion: { 
    name: '情绪调节', 
    color: 'pink', 
    emoji: '😊',
    gradient: 'linear-gradient(to right, rgb(236, 72, 153), rgb(219, 39, 119))'
  },
  sleep: { 
    name: '睡眠训练', 
    color: 'indigo', 
    emoji: '🌙',
    gradient: 'linear-gradient(to right, rgb(99, 102, 241), rgb(79, 70, 229))'
  },
};

export default function TrainingPage() {
  const router = useRouter();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchTrainings();
  }, [router, selectedType]);

  const fetchTrainings = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const url = selectedType
        ? `http://127.0.0.1:8000/api/training/list?training_type=${selectedType}`
        : 'http://127.0.0.1:8000/api/training/list';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTrainings(data);
      } else {
        alert('获取训练列表失败');
      }
    } catch (error) {
      console.error('获取训练列表失败:', error);
      alert('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const startTraining = (id: number) => {
    router.push(`/training/${id}`);
  };

  const types = Object.keys(TRAINING_TYPES);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
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
              <span className="text-2xl">💪</span>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                智能训练指导
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push('/training/history')}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            训练历史
          </button>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 介绍卡片 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">科学训练，提升心理韧性</h2>
          <p className="text-gray-600 leading-relaxed">
            通过呼吸训练、肌肉放松、正念冥想、认知重构、情绪调节和睡眠训练，
            帮助你缓解焦虑、改善睡眠、提升情绪管理能力。每天坚持练习，你会发现自己变得更加平静和自信。
          </p>
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
              selectedType === null
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            全部
          </button>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                selectedType === type
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {TRAINING_TYPES[type].emoji} {TRAINING_TYPES[type].name}
            </button>
          ))}
        </div>

        {/* 训练卡片列表 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : trainings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-600">暂无训练项目</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map((training) => {
              const typeInfo = TRAINING_TYPES[training.training_type];
              return (
                <div
                  key={training.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col"
                  onClick={() => startTraining(training.id)}
                >
                  {/* 卡片头部 */}
                  <div 
                    className="p-6 text-white"
                    style={{ background: typeInfo.gradient }}
                  >
                    <div className="text-5xl mb-3">{training.icon}</div>
                    <h3 className="text-xl font-bold mb-2">{training.training_name}</h3>
                    <div className="flex items-center gap-4 text-sm opacity-90">
                      <span>⏱️ {training.duration} 分钟</span>
                      <span>📊 {training.difficulty_level === 'beginner' ? '初级' : training.difficulty_level === 'intermediate' ? '中级' : '进阶'}</span>
                    </div>
                  </div>

                  {/* 卡片内容 */}
                  <div className="p-6 flex flex-col flex-grow">
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-grow">
                      {training.description}
                    </p>

                    {/* 完成次数 */}
                    {training.completed_count > 0 && (
                      <div className="text-xs text-gray-500 mb-4">
                        已完成 {training.completed_count} 次
                      </div>
                    )}

                    {/* 开始按钮 */}
                    <button
                      className="w-full py-3 rounded-xl font-semibold text-white hover:shadow-lg transform group-hover:scale-105 transition-all duration-200"
                      style={{ background: typeInfo.gradient }}
                    >
                      开始训练
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
