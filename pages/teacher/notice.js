import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export async function getServerSideProps(ctx) {
  const { validateTeacher } = await import('../../lib/utils');
  const session = await validateTeacher(ctx.req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { createServerClient } = await import('../../lib/supabase');
  const sb = createServerClient();
  const { data: notices } = await sb.from('notices').select('*').eq('teacher_id', session.teacher_id).order('created_at', { ascending: false }).limit(20);
  const { data: classes } = await sb.from('classes').select('id,name').eq('teacher_id', session.teacher_id);
  return { props: { notices: notices || [], classes: classes || [], teacherId: session.teacher_id } };
}

const CATEGORIES = [
  { value: 'general', label: '📢 일반 공지', color: 'blue' },
  { value: 'homework', label: '📝 과제 공지', color: 'green' },
  { value: 'event', label: '🎉 행사 안내', color: 'amber' },
  { value: 'urgent', label: '⚠️ 긴급 공지', color: 'red' },
  { value: 'fee', label: '💰 납부 안내', color: 'pink' },
];

const CAT_STYLE = {
  general: 'bg-blue-50 text-blue-700',
  homework: 'bg-green-50 text-green-700',
  event: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
  fee: 'bg-pink-50 text-pink-700',
};

export default function NoticePage({ notices: initialNotices, classes }) {
  const [view, setView] = useState('list'); // list | new
  const [notices, setNotices] = useState(initialNotices);
  const [form, setForm] = useState({ category: 'general', target: 'all', title: '', body: '', schedule: 'now' });
  const [sending, setSending] = useState(false);
  const router = useRouter();

  async function submitNotice() {
    if (!form.title || !form.body) return alert('제목과 내용을 입력해 주세요.');
    setSending(true);
    const res = await fetch('/api/notices/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setNotices(p => [data.notice, ...p]);
      setView('list');
      setForm({ category: 'general', target: 'all', title: '', body: '', schedule: 'now' });
      alert('공지가 카카오톡으로 발송되었습니다!');
    } else alert(data.error || '발송 실패');
    setSending(false);
  }

  return (
    <>
      <Head><title>공지사항 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => view === 'new' ? setView('list') : router.push('/teacher')} className="text-gray-400 text-sm">←</button>
              <span className="text-sm font-medium text-gray-900">{view === 'new' ? '공지사항 작성' : '공지사항 관리'}</span>
            </div>
            {view === 'list' && <button onClick={() => setView('new')} className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg">+ 새 공지</button>}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 pb-10">
          {view === 'list' ? (
            <div className="space-y-3">
              {notices.length === 0 && <p className="text-center text-sm text-gray-400 py-12">공지사항이 없습니다.</p>}
              {notices.map(n => (
                <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5 ${CAT_STYLE[n.category] || 'bg-gray-50 text-gray-600'}`}>
                      {CATEGORIES.find(c => c.value === n.category)?.label || '공지'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        {new Date(n.created_at).toLocaleDateString('ko-KR')}
                        <span className={`px-1.5 py-0.5 rounded ${n.is_sent ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{n.is_sent ? '발송완료' : '미발송'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">카테고리</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">발송 대상</label>
                  <select value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="all">전체 학부모</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}만</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">제목</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="공지 제목을 입력하세요" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">내용</label>
                  <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={5}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                    placeholder="공지 내용을 입력하세요" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">발송 시기</label>
                  <select value={form.schedule} onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="now">지금 즉시 발송</option>
                    <option value="later">임시저장 (나중에 발송)</option>
                  </select>
                </div>
              </div>

              {/* 카카오 미리보기 */}
              <div className="bg-sky-100 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-2 font-medium">카카오톡 미리보기</p>
                <div className="bg-white rounded-xl rounded-tl-none p-3 max-w-xs">
                  <p className="text-xs font-semibold text-gray-900 mb-1">{CATEGORIES.find(c=>c.value===form.category)?.label} · Rise Academy</p>
                  <p className="text-sm font-medium text-gray-900 mb-1">{form.title || '(제목)'}</p>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{form.body || '(내용)'}</p>
                  <div className="bg-yellow-300 rounded-lg py-2 text-center text-xs font-semibold text-gray-800">📋 공지 전체 보기</div>
                </div>
              </div>

              <button onClick={submitNotice} disabled={sending || !form.title || !form.body}
                className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-700">
                {sending ? '발송 중...' : '💬 카카오톡으로 발송'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
