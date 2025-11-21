'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DiaryItem {
  diary_date: string;
  emotions: Array<{ emotion: string; intensity: number }> | null;
  word_count: number;
  main_emotion: string | null;
}

interface AssessmentItem {
  id: number;
  scale_name: string;
  display_name: string;
  total_score: number;
  risk_level: string;
  created_at: string;
}

interface TrainingItem {
  id: number;
  completed_at: string;
  duration: number;
}

interface YearStats {
  diary_count: number;
  assessment_count: number;
  training_count: number;
  training_duration: number;
  total_words: number;
  positive_ratio: number;
}

const EMOTION_COLORS: Record<string, string> = {
  '快乐': '#FEF3C7',
  '兴奋': '#FED7AA',
  '平静': '#DBEAFE',
  '感恩': '#E9D5FF',
  '满足': '#D1FAE5',
  '悲伤': '#E5E7EB',
  '焦虑': '#FEE2E2',
  '愤怒': '#FECACA',
  '失落': '#E0E7FF',
  '孤独': '#F1F5F9',
  '压力': '#FFEDD5',
  '恐惧': '#F3E8FF',
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [userCreatedYear, setUserCreatedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUserInfo();
    fetchData();
  }, [selectedYear]);

  const fetchUserInfo = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        if (userData.created_at) {
          const createdYear = new Date(userData.created_at).getFullYear();
          setUserCreatedYear(createdYear);
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  const fetchData = async () => {
    const token = localStorage.getItem('access_token');
    
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      // 获取日记数据
      const diariesRes = await fetch(
        `http://127.0.0.1:8000/api/diary/list?start_date=${startDate}&end_date=${endDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (diariesRes.ok) {
        const data = await diariesRes.json();
        setDiaries(data);
      }

      // 获取评估数据
      const assessmentsRes = await fetch(
        `http://127.0.0.1:8000/api/assessments/history`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (assessmentsRes.ok) {
        const data = await assessmentsRes.json();
        // 过滤当前年份的评估
        const yearAssessments = data.filter((a: AssessmentItem) => {
          const year = new Date(a.created_at).getFullYear();
          return year === selectedYear;
        });
        setAssessments(yearAssessments);
      }

      // 获取训练数据
      const trainingsRes = await fetch(
        `http://127.0.0.1:8000/api/training/records`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (trainingsRes.ok) {
        const data = await trainingsRes.json();
        // 过滤当前年份的训练
        const yearTrainings = data.filter((t: TrainingItem) => {
          const year = new Date(t.completed_at).getFullYear();
          return year === selectedYear;
        });
        setTrainings(yearTrainings);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 生成情绪趋势数据
  const generateEmotionTrend = () => {
    const sortedDiaries = [...diaries].sort((a, b) => 
      new Date(a.diary_date).getTime() - new Date(b.diary_date).getTime()
    );

    return sortedDiaries.map(diary => {
      let positiveScore = 0;
      if (diary.emotions) {
        const positiveEmotions = ['快乐', '兴奋', '平静', '感恩', '满足'];
        const negativeEmotions = ['悲伤', '焦虑', '愤怒', '失落', '孤独', '压力', '恐惧'];
        
        diary.emotions.forEach(e => {
          if (positiveEmotions.includes(e.emotion)) {
            positiveScore += e.intensity;
          } else if (negativeEmotions.includes(e.emotion)) {
            positiveScore -= e.intensity;
          }
        });
      }

      return {
        date: diary.diary_date,
        score: positiveScore,
        emotion: diary.main_emotion || '未知',
      };
    });
  };

  // 计算情绪分布
  const getEmotionDistribution = () => {
    const emotionCounts: Record<string, number> = {};
    diaries.forEach(diary => {
      if (diary.emotions) {
        diary.emotions.forEach(e => {
          emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
        });
      }
    });
    return emotionCounts;
  };

  // 计算总字数
  const getTotalWords = () => {
    return diaries.reduce((sum, diary) => sum + (diary.word_count || 0), 0);
  };

  // 计算年度统计
  const getYearStats = (): YearStats => {
    const totalWords = getTotalWords();
    const trainingDuration = trainings.reduce((sum, t) => sum + (t.duration || 0), 0);
    
    // 计算积极情绪占比
    let positiveCount = 0;
    let totalEmotions = 0;
    const positiveEmotions = ['快乐', '兴奋', '平静', '感恩', '满足'];
    
    diaries.forEach(diary => {
      if (diary.emotions) {
        diary.emotions.forEach(e => {
          totalEmotions++;
          if (positiveEmotions.includes(e.emotion)) {
            positiveCount++;
          }
        });
      }
    });
    
    const positiveRatio = totalEmotions > 0 ? Math.round((positiveCount / totalEmotions) * 100) : 0;

    return {
      diary_count: diaries.length,
      assessment_count: assessments.length,
      training_count: trainings.length,
      training_duration: trainingDuration,
      total_words: totalWords,
      positive_ratio: positiveRatio
    };
  };

  // 生成年份列表
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = userCreatedYear;
    const endYear = currentYear + 1;
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    );
  }

  const emotionTrend = generateEmotionTrend();
  const emotionDistribution = getEmotionDistribution();
  const yearStats = getYearStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← 返回
            </button>
            <h1 className="text-3xl font-bold text-gray-800">📊 数据分析</h1>
          </div>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {generateYearOptions().map(year => (
              <option key={year} value={year}>{year} 年</option>
            ))}
          </select>
        </div>

        {/* 年度核心指标 */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-2">📝</div>
            <div className="text-3xl font-bold text-blue-500">{yearStats.diary_count}</div>
            <div className="text-sm text-gray-600 mt-2">日记篇数</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-2">✍️</div>
            <div className="text-3xl font-bold text-purple-500">{yearStats.total_words.toLocaleString()}</div>
            <div className="text-sm text-gray-600 mt-2">总字数</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-3xl font-bold text-green-500">{yearStats.assessment_count}</div>
            <div className="text-sm text-gray-600 mt-2">心理评估</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-2">🏋️</div>
            <div className="text-3xl font-bold text-orange-500">{yearStats.training_count}</div>
            <div className="text-sm text-gray-600 mt-2">训练次数</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-2">⏱️</div>
            <div className="text-3xl font-bold text-red-500">{yearStats.training_duration}</div>
            <div className="text-sm text-gray-600 mt-2">训练时长(分)</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-2">😊</div>
            <div className="text-3xl font-bold text-green-500">{yearStats.positive_ratio}%</div>
            <div className="text-sm text-gray-600 mt-2">积极占比</div>
          </div>
        </div>

        <div className="space-y-6">
          {/* 情绪分布 */}
          {Object.keys(emotionDistribution).length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">😊 情绪分布</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(emotionDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([emotion, count]) => (
                    <div key={emotion} className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{ backgroundColor: EMOTION_COLORS[emotion] || '#E5E7EB' }}
                      >
                        {count}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{emotion}</div>
                        <div className="text-sm text-gray-600">
                          {((count / diaries.length) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 情绪趋势图 */}
          {emotionTrend.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">📈 情绪趋势</h2>
              <div className="relative">
                {/* 左侧标签 */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500">
                  <span>积极</span>
                  <span>0</span>
                  <span>消极</span>
                </div>
                
                {/* 图表容器 */}
                <div className="ml-12 h-64">
                  {/* 0刻度线 */}
                  <div className="absolute left-12 right-0 top-1/2 border-t-2 border-gray-300 z-0"></div>
                  
                  {/* 柱状图 */}
                  <div className="relative h-full flex justify-around gap-1">
                    {(() => {
                      // 在循环外计算最大值
                      const maxScore = Math.max(...emotionTrend.map(p => Math.abs(p.score)), 1);
                      
                      return emotionTrend.map((point, index) => {
                        // 计算高度百分比（占据一半容器的百分比）
                        const heightPercent = point.score === 0 
                          ? 2  // 0分显示2%
                          : (Math.abs(point.score) / maxScore) * 45 + 5;  // 5%-50%
                        const isPositive = point.score > 0;
                        const isNeutral = point.score === 0;
                        
                        return (
                          <div
                            key={index}
                            className="h-full flex flex-col group relative flex-1"
                          >
                            {/* 上半部分 - 积极情绪从下往上填充 */}
                            <div className="flex-1 flex flex-col justify-end items-stretch">
                              {isPositive && (
                                <div 
                                  className="w-full bg-green-400 hover:bg-green-500 transition-all rounded-t"
                                  style={{ height: `${heightPercent * 2}%` }}
                                ></div>
                              )}
                            </div>
                            
                            {/* 下半部分 - 消极情绪从上往下填充 */}
                            <div className="flex-1 flex flex-col justify-start items-stretch">
                              {isNeutral && (
                                <div className="w-full h-1 bg-gray-300 hover:bg-gray-400 rounded"></div>
                              )}
                              {!isPositive && !isNeutral && (
                                <div 
                                  className="w-full bg-red-400 hover:bg-red-500 transition-all rounded-b"
                                  style={{ height: `${heightPercent * 2}%` }}
                                ></div>
                              )}
                            </div>
                            
                            {/* Hover提示 */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20">
                              {point.date}
                              <br />
                              {point.emotion} ({point.score > 0 ? '+' : ''}{point.score})
                            </div>
                            
                            {/* 日期标签 */}
                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                              {new Date(point.date).getMonth() + 1}/{new Date(point.date).getDate()}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center mt-10">
                {selectedYear} 年的情绪变化（共 {emotionTrend.length} 篇日记）
              </div>
            </div>
          )}

          {diaries.length === 0 && assessments.length === 0 && trainings.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-600 mb-2">暂无{selectedYear}年数据</p>
              <p className="text-sm text-gray-500 mb-4">开始使用平台功能后，这里会显示你的成长数据</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push('/diary/write')}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  写日记
                </button>
                <button
                  onClick={() => router.push('/assessment')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  心理评估
                </button>
                <button
                  onClick={() => router.push('/training')}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  心理训练
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
