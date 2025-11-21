'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface AssessmentResult {
  id: number;
  template_id: number;
  scale_name: string;
  display_name: string;
  total_score: number;
  risk_level: string;
  interpretation: string;
  suggestions: string | null;
  created_at: string;
}

interface TrendData {
  scale_name: string;
  display_name: string;
  dates: string[];
  scores: number[];
  levels: string[];
  count: number;
}

const RISK_LEVEL_CONFIG: Record<string, { color: string; bg: string; emoji: string; name: string }> = {
  '正常': { color: 'text-green-700', bg: 'bg-green-100 border-green-300', emoji: '✅', name: '正常范围' },
  '低压力': { color: 'text-green-700', bg: 'bg-green-100 border-green-300', emoji: '✅', name: '低压力' },
  '轻度': { color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300', emoji: '⚠️', name: '轻度' },
  '中等压力': { color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300', emoji: '⚠️', name: '中等压力' },
  '中度': { color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300', emoji: '⚠️', name: '中度' },
  '高压力': { color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300', emoji: '⚠️', name: '高压力' },
  '重度': { color: 'text-red-700', bg: 'bg-red-100 border-red-300', emoji: '🆘', name: '重度' },
};

export default function AssessmentResultPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = parseInt(params.id as string);

  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchResult();
  }, [router, recordId]);

  const fetchResult = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // 获取评估结果
      const resultResponse = await fetch(
        `http://127.0.0.1:8000/api/assessments/${recordId}/result`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        setResult(resultData);

        // 获取趋势数据
        const trendResponse = await fetch(
          `http://127.0.0.1:8000/api/assessments/trends/${resultData.scale_name}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (trendResponse.ok) {
          const trendData = await trendResponse.json();
          setTrendData(trendData);
        }
      } else {
        alert('获取评估结果失败');
        router.push('/assessment');
      }
    } catch (error) {
      console.error('获取评估结果失败:', error);
      alert('网络错误，请重试');
      router.push('/assessment');
    } finally {
      setLoading(false);
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

  if (!result) {
    return null;
  }

  const levelConfig = RISK_LEVEL_CONFIG[result.risk_level] || RISK_LEVEL_CONFIG['正常'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航 */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/assessment')}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← 返回评估列表
          </button>
          <h1 className="text-lg font-bold text-gray-800">评估结果</h1>
          <button
            onClick={() => router.push('/assessment/history')}
            className="text-purple-600 hover:text-purple-800 transition-colors text-sm"
          >
            查看历史
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 结果概览卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* 量表名称 */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📊</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{result.display_name}</h2>
            <p className="text-sm text-gray-500">
              完成时间：{new Date(result.created_at).toLocaleString('zh-CN')}
            </p>
          </div>

          {/* 分数和等级 */}
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* 总分 */}
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                {result.total_score}
              </div>
              <p className="text-sm text-gray-600">总分</p>
            </div>

            {/* 分隔线 */}
            <div className="h-16 w-px bg-gray-300" />

            {/* 风险等级 */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 ${levelConfig.bg} mb-2`}>
                <span className="text-2xl">{levelConfig.emoji}</span>
                <span className={`text-xl font-bold ${levelConfig.color}`}>
                  {levelConfig.name}
                </span>
              </div>
              <p className="text-sm text-gray-600">风险等级</p>
            </div>
          </div>

          {/* 结果解释 */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">📝 结果解释</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {result.interpretation}
            </p>
          </div>

          {/* 建议 */}
          {result.suggestions && (
            <div className={`rounded-xl p-6 border-2 ${levelConfig.bg}`}>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                <span className={levelConfig.color}>建议与指导</span>
              </h3>
              <p className={`leading-relaxed whitespace-pre-wrap ${levelConfig.color}`}>
                {result.suggestions}
              </p>
            </div>
          )}
        </div>

        {/* 历史趋势图 */}
        {trendData && trendData.count > 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">📈</span>
              历史趋势（最近 {trendData.count} 次评估）
            </h3>

            {/* 简单的趋势展示 */}
            <div className="space-y-4">
              {trendData.dates.map((date, index) => {
                const score = trendData.scores[index];
                const level = trendData.levels[index];
                const levelConfig = RISK_LEVEL_CONFIG[level] || RISK_LEVEL_CONFIG['正常'];
                const isLatest = index === trendData.dates.length - 1;

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-xl ${
                      isLatest ? 'bg-purple-50 border-2 border-purple-300' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-sm text-gray-600 w-32">{date}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${
                              level === '重度' || level === '高压力'
                                ? 'bg-red-500'
                                : level === '中度' || level === '中等压力'
                                ? 'bg-orange-500'
                                : level === '轻度'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${(score / 40) * 100}%` }}
                          />
                        </div>
                        <div className="text-lg font-bold text-gray-800 w-12 text-right">{score}</div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${levelConfig.bg} ${levelConfig.color}`}>
                      {level}
                    </div>
                    {isLatest && (
                      <span className="text-xs font-semibold text-purple-600">当前</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 趋势分析 */}
            {trendData.count >= 2 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  {trendData.scores[trendData.count - 1] < trendData.scores[trendData.count - 2]
                    ? '✅ 相比上次评估，您的分数有所下降，状态有所改善！'
                    : trendData.scores[trendData.count - 1] > trendData.scores[trendData.count - 2]
                    ? '⚠️ 相比上次评估，您的分数有所上升，建议关注心理健康。'
                    : '➡️ 相比上次评估，您的分数保持稳定。'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/assessment/${result.template_id}`)}
            className="flex-1 py-4 rounded-xl font-semibold text-purple-600 bg-white hover:bg-purple-50 border-2 border-purple-300 transition-all"
          >
            再次评估
          </button>
          <button
            onClick={() => router.push('/assessment')}
            className="flex-1 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg transition-all"
          >
            尝试其他评估
          </button>
        </div>

        {/* 重要提示 */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>重要提示：</strong>本评估结果仅供参考，不能替代专业心理诊断。如果您感到困扰或症状持续，
            建议咨询专业心理医生或精神科医生。
          </p>
        </div>
      </div>
    </div>
  );
}
