import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export async function getServerSideProps(ctx) {
  const { token } = ctx.params;
  const { createServerClient } = await import('../../../lib/supabase');
  const sb = createServerClient();
  const { data } = await sb.from('parent_access_tokens').select('id,expires_at').eq('token', token).eq('is_active', true).single();
  if (!data || new Date(data.expires_at) < new Date()) return { redirect: { destination: `/r/${token}`, permanent: false } };
  return { props: { token } };
}

export default function VerifyPage({ token }) {
  const [lastChar, setLastChar] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const router = useRouter();

  async function handleVerify(e) {
    e.preventDefault();
    if (attempts >= 5) { setError('입력 시도 초과. 담당 선생님께 문의해 주세요.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/tokens/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lastChar, birthMonth }),
      });
      const data = await res.json();
      if (res.ok) { router.push(`/r/${token}/report`); }
      else { setAttempts(n => n + 1); setError(data.error || '입력한 정보가 일치하지 않습니다.'); }
    } catch { setError('오류가 발생했습니다.'); }
    setLoading(false);
  }

  return (
    <>
      <Head><title>본인 확인 · Rise Language Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-7">
            <p className="text-xs text-gray-400 tracking-widest uppercase mb-1">Rise Language Academy</p>
            <h1 className="text-lg font-semibold text-gray-900">학부모 리포트 확인</h1>
            <p className="text-xs text-gray-400 mt-1">자녀 정보로 본인 확인 후 리포트를 보실 수 있습니다</p>
          </div>
          <form onSubmit={handleVerify} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">자녀 이름의 마지막 글자</label>
              <p className="text-xs text-gray-400 mb-2">예) 이름이 <strong>박지우</strong>이면 → <strong>우</strong></p>
              <input type="text" value={lastChar} onChange={e => setLastChar(e.target.value.slice(-1))} maxLength={1} required
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-2xl text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="글자" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">자녀 생년월 (6자리)</label>
              <p className="text-xs text-gray-400 mb-2">예) 2018년 5월생 → <strong>201805</strong></p>
              <input type="text" inputMode="numeric" value={birthMonth} onChange={e => setBirthMonth(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required pattern="[0-9]{6}"
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-2xl text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="YYYYMM" />
            </div>
            {error && <div className="bg-red-50 rounded-lg px-3 py-2.5"><p className="text-xs text-red-600">{error}</p></div>}
            <button type="submit" disabled={loading || !lastChar || birthMonth.length < 6 || attempts >= 5}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-gray-700">
              {loading ? '확인 중...' : '리포트 확인하기'}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">입력하신 정보는 본인 확인에만 사용됩니다</p>
        </div>
      </div>
    </>
  );
}
