import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(data.role === 'director' ? '/admin' : '/teacher');
      } else {
        setError(data.error || '이메일 또는 비밀번호를 확인해 주세요.');
      }
    } catch { setError('서버 오류가 발생했습니다.'); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Head><title>로그인 · Rise Language Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-xs text-gray-400 tracking-widest uppercase mb-1">Rise Language Academy</p>
            <h1 className="text-xl font-semibold text-gray-900">강사 · 원장 로그인</h1>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">이메일</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="teacher@rise.com" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">비밀번호</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="••••••••" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">학부모님은 카카오톡으로 받은 링크를 사용해 주세요.</p>
        </div>
      </div>
    </>
  );
}
