'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: '🤖',
      title: '智能对话',
      description: '24 小时情绪陪伴，倾听你的每一句心声',
    },
    {
      icon: '📋',
      title: '心理评估',
      description: '专业心理量表，科学评估心理状态',
    },
    {
      icon: '💪',
      title: '训练指导',
      description: '认知训练 + 沟通技巧，提升心理韧性',
    },
    {
      icon: '📖',
      title: '情绪日记',
      description: 'AI 智能分析，记录成长每一天',
    },
    {
      icon: '💖',
      title: '心翼之墙',
      description: '365 天成长轨迹，见证你的蜕变',
    },
    {
      icon: '📊',
      title: '数据分析',
      description: '可视化仪表盘，全面了解自己',
    },
  ];

  const principles = [
    {
      icon: '🔒',
      title: '隐私优先',
      description: '所有数据本地存储，不上传云端',
    },
    {
      icon: '🎯',
      title: '专业支持',
      description: '基于 REBT 理性情绪行为疗法',
    },
    {
      icon: '⏰',
      title: '随时陪伴',
      description: '7x24 小时在线，无需预约',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* 顶部导航栏 */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💕</span>
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              心翼 Xinyi
            </span>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            开始使用
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
              心翼 Xinyi
            </h1>
            <p className="text-2xl md:text-3xl text-gray-600 mb-4">
              你的 24/7 AI 心理健康陪伴助手
            </p>
            <p className="text-lg text-gray-500 mb-12">
              隐私优先 · 本地部署 · 专业陪伴
            </p>
            
            {/* CTA 按钮 */}
            <button
              onClick={() => router.push('/login')}
              className="px-12 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-bold rounded-full hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              开始使用 →
            </button>
          </div>

          {/* 配图占位 */}
          <div className="mt-16 flex justify-center">
            <div className="w-full max-w-2xl h-64 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl shadow-xl flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💕</div>
                <p className="text-gray-600 text-lg">温暖陪伴，守护心灵</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 核心功能介绍 */}
      <section className="py-20 px-6 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-4">
            六大核心功能
          </h2>
          <p className="text-center text-gray-600 mb-16">
            全方位守护你的心理健康
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 设计理念 */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-16">
            我们的设计理念
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {principles.map((principle, index) => (
              <div
                key={index}
                className="text-center p-8 bg-white/70 rounded-2xl backdrop-blur-sm"
              >
                <div className="text-5xl mb-4">{principle.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {principle.title}
                </h3>
                <p className="text-gray-600">{principle.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 技术亮点 */}
      <section className="py-20 px-6 bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-8">
            技术驱动，值得信赖
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="p-6 bg-white rounded-xl shadow-md">
              <h4 className="font-bold text-lg text-purple-600 mb-2">🤖 本地 AI 模型</h4>
              <p className="text-gray-600">使用 Ollama 本地部署，保护隐私</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-md">
              <h4 className="font-bold text-lg text-purple-600 mb-2">🔐 双层判断逻辑</h4>
              <p className="text-gray-600">隐私保护 + 质量保证</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-md">
              <h4 className="font-bold text-lg text-purple-600 mb-2">🎯 多智能体协作</h4>
              <p className="text-gray-600">自研智能体系统，精准回应</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-md">
              <h4 className="font-bold text-lg text-purple-600 mb-2">💾 本地存储</h4>
              <p className="text-gray-600">所有数据保存在你的电脑上</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-3xl p-12 shadow-2xl text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              准备好开始你的心理健康之旅了吗？
            </h2>
            <p className="text-xl mb-8 opacity-90">
              现在就体验心翼，让我们陪伴你的每一天
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-12 py-4 bg-white text-purple-600 text-xl font-bold rounded-full hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              立即开始 →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center text-gray-600">
          <p className="mb-2">© 2025 心翼 Xinyi - 仅供学习研究使用</p>
          <p className="text-sm text-gray-500">
            技术栈：Next.js + FastAPI + SQLite + Ollama
          </p>
        </div>
      </footer>
    </div>
  );
}
