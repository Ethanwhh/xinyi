'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id: number;
  username: string;
  created_at: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('认证失败');
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (err: any) {
      setError(err.message);
      localStorage.removeItem('access_token');
      localStorage.removeItem('username');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    router.push('/');
  };

  const modules = [
    { id: 1, name: '智能对话', icon: '🤖', path: '/chat', color: 'from-blue-400 to-blue-600' },
    { id: 2, name: '心理评估', icon: '📋', path: '/assessment', color: 'from-purple-400 to-purple-600' },
    { id: 3, name: '训练指导', icon: '💪', path: '/training', color: 'from-green-400 to-green-600' },
    { id: 4, name: '情绪日记', icon: '📖', path: '/diary', color: 'from-pink-400 to-pink-600' },
    { id: 5, name: '心翼之墙', icon: '💖', path: '/growth', color: 'from-red-400 to-red-600' },
    { id: 6, name: '数据分析', icon: '📊', path: '/analytics', color: 'from-indigo-400 to-indigo-600' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💕</div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💕</span>
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              心翼 Xinyi
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-gray-700">你好，{userInfo?.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* 欢迎区域 */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            欢迎回来，{userInfo?.username}！
          </h1>
          <p className="text-xl text-gray-600">
            选择一个模块开始你的心理健康之旅
          </p>
        </div>

        {/* 功能模块网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => {
                if (module.id === 1 || module.id === 2 || module.id === 3 || module.id === 4 || module.id === 5 || module.id === 6) {
                  // 所有核心功能模块已实现
                  router.push(module.path);
                } else {
                  alert(`${module.name}功能即将上线！`);
                }
              }}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 p-8 text-left"
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${module.color} flex items-center justify-center text-3xl mb-4`}>
                {module.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {module.name}
              </h3>
              <p className="text-gray-600">点击进入 {module.name} 模块</p>
            </button>
          ))}
        </div>

        {/* 用户信息卡片 */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">账户信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">用户 ID：</span>
              <span className="text-gray-800 font-semibold">{userInfo?.id}</span>
            </div>
            <div>
              <span className="text-gray-600">用户名：</span>
              <span className="text-gray-800 font-semibold">{userInfo?.username}</span>
            </div>
            <div>
              <span className="text-gray-600">注册时间：</span>
              <span className="text-gray-800 font-semibold">
                {userInfo?.created_at ? new Date(userInfo.created_at).toLocaleString('zh-CN') : ''}
              </span>
            </div>
            <div>
              <span className="text-gray-600">账户状态：</span>
              <span className={`font-semibold ${userInfo?.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {userInfo?.is_active ? '正常' : '已禁用'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
