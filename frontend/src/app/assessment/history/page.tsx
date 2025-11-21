'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HistoryItem {
  id: number;
  scale_name: string;
  display_name: string;
  total_score: number;
  risk_level: string;
  created_at: string;
}

const RISK_LEVEL_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  '正常': { color: 'text-green-700', bg: 'bg-green-100', emoji: '✅' },
  '低压力': { color: 'text-green-700', bg: 'bg-green-100', emoji: '✅' },
  '轻度': { color: 'text-yellow-700', bg: 'bg-yellow-100', emoji: '⚠️' },
  '中等压力': { color: 'text-yellow-700', bg: 'bg-yellow-100', emoji: '⚠️' },
  '中度': { color: 'text-orange-700', bg: 'bg-orange-100', emoji: '⚠️' },
  '高压力': { color: 'text-orange-700', bg: 'bg-orange-100', emoji: '⚠️' },
  '重度': { color: 'text-red-700', bg: 'bg-red-100', emoji: '🆘' },
};

export default function AssessmentHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScale, setSelectedScale] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchHistory();
  }, [router, selectedScale]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const url = selectedScale
        ? `http://127.0.0.1:8000/api/assessments/history?scale_name=${selectedScale}`
        : 'http://127.0.0.1:8000/api/assessments/history';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        alert('获取历史记录失败');
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      alert('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const viewResult = (id: number) => {
    router.push(`/assessment/result/${id}`);
  };

  // 获取所有独特的量表类型
  const uniqueScales = Array.from(new Set(history.map((item) => item.scale_name)));

  // 按日期分组
  const groupedHistory: Record<string, HistoryItem[]> = {};
  history.forEach((item) => {
    const date = new Date(item.created_at).toLocaleDateString('zh-CN');
    if (!groupedHistory[date]) {
      groupedHistory[date] = [];
    }
    groupedHistory[date].push(item);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航 */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/assessment')}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← 返回
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              评估历史
            </span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 统计卡片 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">{history.length}</div>
              <div className="text-sm text-gray-600">总评估次数</div>
            </div>
            <div className="text-center border-l border-r border-gray-200">
              <div className="text-3xl font-bold text-pink-600 mb-1">{uniqueScales.length}</div>
              <div className="text-sm text-gray-600">评估类型</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {history.length > 0 ? Math.ceil((Date.now() - new Date(history[history.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
              </div>
              <div className="text-sm text-gray-600">天数记录</div>
            </div>
          </div>
        </div>

        {/* 筛选器 */}
        {uniqueScales.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedScale(null)}
              className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                selectedScale === null
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            {uniqueScales.map((scale) => (
              <button
                key={scale}
                onClick={() => setSelectedScale(scale)}
                className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  selectedScale === scale
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {scale}
              </button>
            ))}
          </div>
        )}

        {/* 历史记录列表 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 text-lg mb-2">暂无评估历史</p>
            <p className="text-gray-500 text-sm mb-6">完成首次评估后，这里会显示您的历史记录</p>
            <button
              onClick={() => router.push('/assessment')}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg transition-all"
            >
              开始评估
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date}>
                {/* 日期标题 */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-sm font-semibold text-gray-700">{date}</div>
                  <div className="flex-1 h-px bg-gray-300" />
                </div>

                {/* 该日期的评估记录 */}
                <div className="space-y-3">
                  {items.map((item) => {
                    const levelConfig = RISK_LEVEL_CONFIG[item.risk_level] || RISK_LEVEL_CONFIG['正常'];
                    return (
                      <div
                        key={item.id}
                        onClick={() => viewResult(item.id)}
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-5 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                                {item.display_name}
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${levelConfig.bg} ${levelConfig.color}`}>
                                {levelConfig.emoji} {item.risk_level}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>📊 得分: {item.total_score}</span>
                              <span>⏰ {new Date(item.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div className="text-gray-400 group-hover:text-purple-600 transition-colors">
                            →
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
