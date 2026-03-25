import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export async function getServerSideProps(ctx) {
  const { validateTeacher } = await import('../../lib/utils');
  const session = await validateTeacher(ctx.req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { createServerClient } = await import('../../lib/supabase');
  const sb = createServerClient();
  const { data: teachers } = await sb.from('users').select('id,name,email,role,class_id,classes(name)').in('role',['teacher','director']).order('name');
  const { data: classes } = await sb.from('classes').select('id,name,level_code');
  return { props: { teachers: teachers || [], classes: classes || [] } };
}

export default function TeachersPage({ teachers, classes }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'teacher', class_id: '' });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function addTeacher() {
    if (!form.name || !form.email) return;
    setSaving(true);
    const res = await fetch('/api/admin/add-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) { alert(`강사 계정 생성 완료!\n임시 비밀번호: ${data.tempPassword}`); router.reload(); }
    else alert(data.error || '생성 실패');
    setSaving(false);
  }

  return (
    <>
      <Head><title>강사 관리 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm">←</button>
            <span className="text-sm font-medium text-gray-900">강사 관리</span>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 pb-10 space-y-4">

          {/* 강사 목록 */}
          <div className="space-y-2">
            {teachers.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-sm font-semibold text-purple-700 flex-shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.email}</p>
                  {t.classes && <p className="text-xs text-blue-500 mt-0.5">{t.classes.name}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg ${t.role === 'director' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-500'}`}>
                  {t.role === 'director' ? '원장' : '강사'}
                </span>
              </div>
            ))}
          </div>

          {/* 강사 추가 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-medium text-gray-700">새 강사 계정 추가</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">이름</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Tia Teacher" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">역할</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="teacher">강사</option>
                  <option value="director">원장</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">이메일</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="teacher@rise.com" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">담당 클래스 (선택)</label>
              <select value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="">클래스 선택...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level_code})</option>)}
              </select>
            </div>
            <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
              계정 생성 후 임시 비밀번호가 표시됩니다. 강사에게 전달 후 변경 권장.
            </div>
            <button onClick={addTeacher} disabled={saving || !form.name || !form.email}
              className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-40">
              {saving ? '생성 중...' : '강사 계정 생성'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
