import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export async function getServerSideProps(ctx) {
  const { validateTeacher } = await import('../../lib/utils');
  const session = await validateTeacher(ctx.req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { createServerClient } = await import('../../lib/supabase');
  const sb = createServerClient();
  const { data: classes } = await sb.from('classes').select('id,name,level_code');
  const { data: units } = await sb.from('curriculum_units').select('*').order('week_number');
  const { data: schedules } = await sb.from('weekly_schedule').select('*,curriculum_units(unit_name)').order('week_start');
  return { props: { classes: classes || [], units: units || [], schedules: schedules || [] } };
}

export default function SchedulePage({ classes, units, schedules: initSchedules }) {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || '');
  const [schedules, setSchedules] = useState(initSchedules);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const filtered = schedules.filter(s => s.class_id === selectedClass).sort((a, b) => new Date(a.week_start) - new Date(b.week_start));
  const today = new Date().toISOString().split('T')[0];

  function getStatus(s) {
    const start = new Date(s.week_start);
    const now = new Date();
    if (!s.is_active) return { label: '비활성', cls: 'bg-gray-100 text-gray-500' };
    if (start <= now) {
      // check if next schedule has started
      const idx = filtered.indexOf(s);
      const next = filtered[idx + 1];
      if (next && new Date(next.week_start) <= now) return { label: '완료', cls: 'bg-gray-100 text-gray-500' };
      return { label: '● 진행 중', cls: 'bg-green-100 text-green-700' };
    }
    return { label: '예약됨', cls: 'bg-blue-50 text-blue-600' };
  }

  async function saveSchedule() {
    setSaving(true);
    const res = await fetch('/api/schedule/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editItem),
    });
    const data = await res.json();
    if (res.ok) {
      setSchedules(p => p.map(s => s.id === data.schedule.id ? { ...s, ...data.schedule } : s));
      setEditItem(null);
    } else alert(data.error || '저장 실패');
    setSaving(false);
  }

  async function applyNow(scheduleId) {
    const res = await fetch('/api/schedule/apply-now', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduleId }) });
    if (res.ok) {
      alert('즉시 적용 완료! 학생 화면에 바로 반영됩니다.');
      router.reload();
    }
  }

  return (
    <>
      <Head><title>커리큘럼 일정 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm">←</button>
            <span className="text-sm font-medium text-gray-900">커리큘럼 일정 관리</span>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 pb-10 space-y-4">

          {/* 클래스 선택 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="text-xs text-gray-500 block mb-2">클래스 선택</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level_code})</option>)}
            </select>
          </div>

          {/* 일정 목록 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-700">주차별 단원 & 시작 날짜</p>
              <p className="text-xs text-gray-400">✎ 아이콘으로 수정</p>
            </div>
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">일정이 없습니다. 아래에서 추가하세요.</p>
            ) : (
              filtered.map((s, i) => {
                const st = getStatus(s);
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <span className="text-xs text-gray-400 w-8 flex-shrink-0">{i + 1}주</span>
                    <span className="text-sm text-gray-900 flex-1 truncate">{s.curriculum_units?.unit_name || '단원 미지정'}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 font-mono">{new Date(s.week_start).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ~</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                      <button onClick={() => setEditItem({ ...s })} className="text-xs text-gray-400 hover:text-gray-700 px-1">✎</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 수정 패널 */}
          {editItem && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-medium text-blue-700">일정 수정</p>
              <div>
                <label className="text-xs text-gray-500 block mb-1">단원 선택</label>
                <select value={editItem.unit_id || ''} onChange={e => setEditItem(p => ({ ...p, unit_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">단원 선택...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">시작 날짜</label>
                <input type="date" value={editItem.week_start} onChange={e => setEditItem(p => ({ ...p, week_start: e.target.value }))}
                  min={today} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">지정 날짜 자정에 자동 전환됩니다. "즉시 적용"을 누르면 지금 바로 반영됩니다.</p>
              <div className="flex gap-2">
                <button onClick={() => applyNow(editItem.id)} className="flex-1 py-2 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg font-medium">⚡ 즉시 적용</button>
                <button onClick={saveSchedule} disabled={saving} className="flex-1 py-2 text-xs bg-gray-900 text-white rounded-lg font-medium disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
                <button onClick={() => setEditItem(null)} className="py-2 px-3 text-xs text-gray-500 border border-gray-200 rounded-lg">취소</button>
              </div>
            </div>
          )}

          <button onClick={() => router.push('/admin/content')}
            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium">
            콘텐츠 관리 (문장·단어) →
          </button>
        </div>
      </div>
    </>
  );
}
