'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Emotion {
  emotion: string;
  intensity: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: string[];
}

const AVAILABLE_EMOTIONS = [
  { name: '快乐', icon: '😊', type: 'positive' },
  { name: '兴奋', icon: '🤩', type: 'positive' },
  { name: '平静', icon: '😌', type: 'positive' },
  { name: '感恩', icon: '🙏', type: 'positive' },
  { name: '满足', icon: '😌', type: 'positive' },
  { name: '悲伤', icon: '😢', type: 'negative' },
  { name: '焦虑', icon: '😰', type: 'negative' },
  { name: '愤怒', icon: '😠', type: 'negative' },
  { name: '失落', icon: '😔', type: 'negative' },
  { name: '孤独', icon: '😞', type: 'negative' },
  { name: '压力', icon: '😫', type: 'negative' },
  { name: '恐惧', icon: '😨', type: 'negative' },
];

export default function DiaryWritePage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<Emotion[]>([]);
  const [emotionTrigger, setEmotionTrigger] = useState('');
  const [lifeDimensions, setLifeDimensions] = useState({
    sleep: 3,
    diet: 3,
    exercise: 0,
    social: 0,
    productivity: 3,
  });
  const [guidedAnswer, setGuidedAnswer] = useState('');
  const [guidedQuestion, setGuidedQuestion] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchTemplates();
    fetchGuidedQuestion();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/diary/templates/list', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('获取模板失败:', error);
    }
  };

  const fetchGuidedQuestion = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/diary/guided-questions/today', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setGuidedQuestion(data.question);
      }
    } catch (error) {
      console.error('获取引导问题失败:', error);
    }
  };

  const toggleEmotion = (emotionName: string) => {
    const existing = selectedEmotions.find(e => e.emotion === emotionName);
    if (existing) {
      setSelectedEmotions(selectedEmotions.filter(e => e.emotion !== emotionName));
    } else {
      setSelectedEmotions([...selectedEmotions, { emotion: emotionName, intensity: 5 }]);
    }
  };

  const updateEmotionIntensity = (emotionName: string, intensity: number) => {
    setSelectedEmotions(
      selectedEmotions.map(e =>
        e.emotion === emotionName ? { ...e, intensity } : e
      )
    );
  };

  const applyTemplate = (template: Template) => {
    setSelectedTemplate(template.id);
    const templateContent = template.questions.map((q, i) => `${i + 1}. ${q}\n\n`).join('');
    setContent(templateContent);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      alert('请输入日记内容');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/diary/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diary_date: diaryDate,
          content,
          emotions: selectedEmotions.length > 0 ? selectedEmotions : null,
          emotion_trigger: emotionTrigger || null,
          life_dimensions: lifeDimensions,
          guided_responses: guidedAnswer ? { question: guidedQuestion, answer: guidedAnswer } : null,
          template_used: selectedTemplate,
          writing_duration: 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiFeedback(data.ai_feedback);
        setShowAIFeedback(true);
      } else {
        const error = await response.json();
        alert(error.detail || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (showAIFeedback && aiFeedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <nav className="bg-white/80 backdrop-blur-md shadow-sm px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-lg font-semibold text-gray-800">AI 反馈</div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">日记已保存！</h2>
              <p className="text-gray-600">以下是 AI 为你生成的反馈</p>
            </div>

            {/* 情绪分析 */}
            {aiFeedback.emotion_analysis && (
              <div className="mb-6 p-6 bg-blue-50 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">💭 情绪分析</h3>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>主要情绪：</strong>{aiFeedback.emotion_analysis.primary_emotion}
                  </p>
                  <p className="text-gray-700">
                    <strong>情绪强度：</strong>{aiFeedback.emotion_analysis.emotion_intensity}/10
                  </p>
                  <p className="text-gray-700">
                    <strong>情绪效价：</strong>
                    {aiFeedback.emotion_analysis.emotion_valence === 'positive' ? '积极 😊' : 
                     aiFeedback.emotion_analysis.emotion_valence === 'negative' ? '消极 😔' : '中性 😐'}
                  </p>
                </div>
              </div>
            )}

            {/* 生活质量评价 */}
            {aiFeedback.life_quality && aiFeedback.life_quality.length > 0 && (
              <div className="mb-6 p-6 bg-green-50 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🌱 生活质量评价</h3>
                <ul className="space-y-2">
                  {aiFeedback.life_quality.map((comment: string, index: number) => (
                    <li key={index} className="text-gray-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{comment}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 积极亮点 */}
            {aiFeedback.positive_highlights && aiFeedback.positive_highlights.length > 0 && (
              <div className="mb-6 p-6 bg-yellow-50 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">⭐ 积极亮点</h3>
                <ul className="space-y-2">
                  {aiFeedback.positive_highlights.map((highlight: string, index: number) => (
                    <li key={index} className="text-gray-700 flex items-start">
                      <span className="mr-2">✨</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 推荐内容 */}
            {aiFeedback.recommendations && aiFeedback.recommendations.length > 0 && (
              <div className="mb-6 p-6 bg-purple-50 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">💡 推荐内容</h3>
                <div className="space-y-3">
                  {aiFeedback.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="bg-white p-4 rounded-lg">
                      <div className="font-semibold text-gray-800">{rec.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{rec.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => router.push('/diary')}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                查看日记列表
              </button>
              <button
                onClick={() => {
                  setShowAIFeedback(false);
                  setContent('');
                  setSelectedEmotions([]);
                  setEmotionTrigger('');
                  setGuidedAnswer('');
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
              >
                继续写日记
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* 顶部导航 */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/diary')}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← 返回
          </button>
          <div className="text-lg font-semibold text-gray-800">写日记</div>
          <div className="w-16"></div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 主编辑区 */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {/* 日期选择 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 日记日期
                </label>
                <input
                  type="date"
                  value={diaryDate}
                  onChange={(e) => setDiaryDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 文本编辑器 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ✍️ 今天发生了什么？
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="开始记录你的心情..."
                  className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="text-sm text-gray-500 mt-2">
                  字数：{content.length}
                </div>
              </div>

              {/* 情绪触发事件 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  💭 情绪触发事件（可选）
                </label>
                <input
                  type="text"
                  value={emotionTrigger}
                  onChange={(e) => setEmotionTrigger(e.target.value)}
                  placeholder="是什么引发了这些情绪？"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 引导式问题 */}
              {guidedQuestion && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💡 今日思考：{guidedQuestion}
                  </label>
                  <textarea
                    value={guidedAnswer}
                    onChange={(e) => setGuidedAnswer(e.target.value)}
                    placeholder="写下你的答案..."
                    className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              )}

              {/* 保存按钮 */}
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? '保存中...' : '💾 保存日记'}
              </button>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 快捷模板 - 单行版 */}
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📝 快捷模板</h3>
              <div className="flex gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className={`flex-1 p-2 rounded-lg border-2 text-center transition-all ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    title={template.description}
                  >
                    <div className="text-2xl mb-1">{template.icon}</div>
                    <div className="text-xs font-medium text-gray-700 leading-tight">{template.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 情绪选择 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">😊 今天的情绪</h3>
              <div className="grid grid-cols-4 gap-2">
                {AVAILABLE_EMOTIONS.map((emotion) => {
                  const isSelected = selectedEmotions.find(e => e.emotion === emotion.name);
                  return (
                    <button
                      key={emotion.name}
                      onClick={() => toggleEmotion(emotion.name)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl mb-1">{emotion.icon}</div>
                      <div className="text-xs text-gray-700">{emotion.name}</div>
                    </button>
                  );
                })}
              </div>

              {/* 情绪强度调节 */}
              {selectedEmotions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {selectedEmotions.map((emotion) => (
                    <div key={emotion.emotion} className="mb-3">
                      <label className="text-sm text-gray-700 mb-1 block flex justify-between">
                        <span>{emotion.emotion}</span>
                        <span className="font-semibold">{emotion.intensity}/10</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={emotion.intensity}
                        onChange={(e) => updateEmotionIntensity(emotion.emotion, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 生活维度 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🌱 生活维度</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-700 mb-1 block flex justify-between">
                    <span>😴 睡眠质量</span>
                    <span className="font-semibold">{lifeDimensions.sleep}/5</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={lifeDimensions.sleep}
                    onChange={(e) => setLifeDimensions({...lifeDimensions, sleep: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 mb-1 block flex justify-between">
                    <span>🍎 饮食规律</span>
                    <span className="font-semibold">{lifeDimensions.diet}/5</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={lifeDimensions.diet}
                    onChange={(e) => setLifeDimensions({...lifeDimensions, diet: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 mb-1 block flex justify-between">
                    <span>🏃 运动时长（分钟）</span>
                    <span className="font-semibold">{lifeDimensions.exercise}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={lifeDimensions.exercise === 0 ? '' : lifeDimensions.exercise}
                    onChange={(e) => setLifeDimensions({...lifeDimensions, exercise: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 mb-1 block flex justify-between">
                    <span>👥 社交互动（人）</span>
                    <span className="font-semibold">{lifeDimensions.social}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={lifeDimensions.social === 0 ? '' : lifeDimensions.social}
                    onChange={(e) => setLifeDimensions({...lifeDimensions, social: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 mb-1 block flex justify-between">
                    <span>💼 工作效率</span>
                    <span className="font-semibold">{lifeDimensions.productivity}/5</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={lifeDimensions.productivity}
                    onChange={(e) => setLifeDimensions({...lifeDimensions, productivity: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
