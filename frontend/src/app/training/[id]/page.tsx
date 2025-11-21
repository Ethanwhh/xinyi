'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface TrainingDetail {
  id: number;
  training_type: string;
  training_name: string;
  description: string;
  steps: string[];
  duration: number;
  frequency: string;
  difficulty_level: string;
  suitable_scenarios: string[];
  media_url: string | null;
  icon: string;
}

export default function TrainingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const trainingId = params.id as string;

  const [training, setTraining] = useState<TrainingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchTrainingDetail();
  }, [trainingId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTraining && !isPaused && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTrainingComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTraining, isPaused, timeRemaining]);

  const fetchTrainingDetail = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://127.0.0.1:8000/api/training/${trainingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTraining(data);
      } else {
        alert('获取训练详情失败');
        router.push('/training');
      }
    } catch (error) {
      console.error('获取训练详情失败:', error);
      alert('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const startTraining = () => {
    if (training) {
      setIsTraining(true);
      setTimeRemaining(training.duration * 60);
      setCurrentStep(0);
    }
  };

  const handleTrainingComplete = () => {
    setIsTraining(false);
    setShowFeedback(true);
  };

  const submitFeedback = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/training/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          training_id: parseInt(trainingId),
          duration: training!.duration,
          feedback: {
            rating,
            comment: feedback,
          },
        }),
      });

      if (response.ok) {
        alert('训练完成！');
        router.push('/training/history');
      } else {
        alert('提交失败，请重试');
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('网络错误，请重试');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!training) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* 顶部导航 */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/training')}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← 返回
          </button>
          <div className="text-lg font-semibold text-gray-800">
            {training.training_name}
          </div>
          <div className="w-16"></div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!isTraining && !showFeedback ? (
          // 训练介绍页
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{training.icon}</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {training.training_name}
              </h1>
              <p className="text-gray-600">{training.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-600">{training.duration}</div>
                <div className="text-sm text-gray-600">分钟</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-purple-600">{training.steps.length}</div>
                <div className="text-sm text-gray-600">步骤</div>
              </div>
              <div className="bg-pink-50 rounded-xl p-4">
                <div className="text-lg font-semibold text-pink-600">
                  {training.difficulty_level === 'beginner' ? '初级' : training.difficulty_level === 'intermediate' ? '中级' : '进阶'}
                </div>
                <div className="text-sm text-gray-600">难度</div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">训练步骤</h3>
              <div className="space-y-3">
                {training.steps.map((step, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1 pt-1 text-gray-700">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            {training.suitable_scenarios.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">适用场景</h3>
                <div className="flex flex-wrap gap-2">
                  {training.suitable_scenarios.map((scenario, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm"
                    >
                      {scenario}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
              <div className="flex gap-2">
                <span className="text-yellow-600">💡</span>
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">
                    <strong>建议频率：</strong>{training.frequency}
                  </p>
                  <p className="text-sm text-yellow-800 mt-1">
                    找一个安静舒适的环境，让自己放松下来，准备好了就开始吧！
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={startTraining}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
            >
              开始训练
            </button>
          </div>
        ) : isTraining ? (
          // 训练进行中
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* 计时器 */}
            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-gray-600">剩余时间</div>
              
              {/* 进度条 */}
              <div className="mt-4 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-1000"
                  style={{
                    width: `${((training.duration * 60 - timeRemaining) / (training.duration * 60)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* 当前步骤 */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  步骤 {currentStep + 1} / {training.steps.length}
                </h3>
                <div className="flex gap-2">
                  {training.steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentStep ? 'bg-blue-600' : index < currentStep ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                <p className="text-lg text-gray-800 leading-relaxed">
                  {training.steps[currentStep]}
                </p>
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex gap-4">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex-1 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
              >
                {isPaused ? '▶️ 继续' : '⏸️ 暂停'}
              </button>
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  上一步
                </button>
              )}
              {currentStep < training.steps.length - 1 && (
                <button
                  onClick={() => setCurrentStep(prev => Math.min(training.steps.length - 1, prev + 1))}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  下一步
                </button>
              )}
              {currentStep === training.steps.length - 1 && (
                <button
                  onClick={handleTrainingComplete}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  完成训练
                </button>
              )}
            </div>
          </div>
        ) : (
          // 训练反馈页
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">训练完成！</h2>
              <p className="text-gray-600">给这次训练打个分吧</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                训练效果（1-5星）
              </label>
              <div className="flex justify-center gap-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="text-4xl transition-transform hover:scale-125"
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                训练感受（可选）
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="分享一下这次训练的感受..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/training')}
                className="flex-1 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
              >
                返回列表
              </button>
              <button
                onClick={submitFeedback}
                disabled={rating === 0}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                提交反馈
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
