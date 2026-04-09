import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function getServerSideProps(ctx) {
  const cookieHeader = ctx.req.headers.cookie || '';
  let sessionKey = '';
  cookieHeader.split(';').forEach(c => {
    const parts = c.trim().split('=');
    if (parts[0] === 'teacher_session') sessionKey = parts.slice(1).join('=');
  });

  if (!sessionKey) return { redirect: { destination: '/login', permanent: false } };

  const sb = getSupabase();

  const { data: sess } = await sb
    .from('teacher_sessions')
    .select('teacher_id,expires_at')
    .eq('session_key', sessionKey)
    .maybeSingle();

  if (!sess || new Date(sess.expires_at) < new Date()) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const { data: teacher } = await sb
    .from('users')
    .select('id,name,role')
    .eq('id', sess.teacher_id)
    .maybeSingle();

  const { data: students } = await sb
    .from('users')
    .select('id,name,class_id,classes(id,name)')
    .eq('role', 'student')
    .order('name');

  return {
    props: {
      teacher: teacher || null,
      students: students || [],
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
    },
  };
}

function getDaysLeft(exp) {
  return Math.max(0, Math.ceil((new Date(exp) - new Date()) / 86400000));
}

export default function TeacherPage({ teacher, students, siteUrl }) {
  const [links, setLinks] = useState({});
  const [gen, setGen] = useState({});
  const [copied, setCopied] = useState({});
  const router = useRouter();

  async function generateLink(studentId) {
    setGen(p => ({ ...p, [studentId]: true }));
    const res = await fetch('/api/tokens/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json();
    if (res.ok) setLinks(p => ({ ...p, [studentId]: data.token }));
    else alert('링크 생성 실패');
    setGen(p => ({ ...p, [studentId]: false }));
  }

  function copyLink(studentId, token) {
    navigator.clipboard.writeText(`${siteUrl}/r/${token.token}`).then(() => {
      setCopied(p => ({ ...p, [studentId]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [studentId]: false })), 2500);
    });
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      <Head><title>강사 대시보드 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Rise Language Academy</p>
              <p className="text-sm font-semibold text-gray-900">{teacher?.name} 선생님</p>
            </div>
            <div className="flex items-center gap-3">
              {teacher?.role === 'director' && (
                <button onClick={() => router.push('/admin')} className="text-xs text-blue-600">관리자</button>
              )}
              <button onClick={logout} className="text-xs text-gray-400">로그아웃</button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '리포트 작성', icon: '📝', href: '/teacher/report' },
              { label: '엑셀 업로드', icon: '📊', href: '/teacher/report/upload' },
              { label: '공지사항', icon: '📢', href: '/teacher/notice' },
              { label: '이번 주 콘텐츠', icon: '📚', href: '/teacher/content' },
            ].map(m => (
              <button key={m.href} onClick={() => router.push(m.href)}
                className="bg-white rounded-xl border border-gray-200 p-3 text-center hover:border-gray-300">
                <div className="text-xl mb-1">{m.icon}</div>
                <div className="text-xs text-gray-600 font-medium">{m.label}</div>
              </button>
            ))}
          </div>

          <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
            <strong>링크 사용법</strong> · 학생 이름 옆 "링크 생성" → "복사" → 카카오톡 전송 · 링크는 <strong>10일간 유효</strong>
          </div>

          <p className="text-xs text-gray-400 text-center">전체 {students.length}명</p>

          {students.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400">등록된 학생이 없습니다.</div>
          )}

          {students.map(student => {
            const token = links[student.id];
            const daysLeft = token ? getDaysLeft(token.expires_at) : 0;
            const isValid = token && daysLeft > 0;
            return (
              <div key={student.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.classes?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => generateLink(student.id)} disabled={gen[student.id]}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white disabled:opacity-50 whitespace-nowrap flex-shrink-0">
                    {gen[student.id] ? '생성 중...' : isValid ? '재발급' : '링크 생성'}
                  </button>
                </div>
                {isValid && (
                  <>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 min-w-0 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-mono truncate border border-gray-100">
                        {siteUrl}/r/{token.token}
                      </div>
                      <button onClick={() => copyLink(student.id, token)}
                        className={`text-xs px-3 py-2 rounded-lg border whitespace-nowrap flex-shrink-0 ${copied[student.id] ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                        {copied[student.id] ? '✓ 복사됨' : '복사'}
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400">{daysLeft}일 후 만료</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
