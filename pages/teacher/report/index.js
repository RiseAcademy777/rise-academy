import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export async function getServerSideProps(ctx) {
  const { validateTeacher } = await import('../../../lib/utils');
  const session = await validateTeacher(ctx.req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { createServerClient } = await import('../../../lib/supabase');
  const sb = createServerClient();
  const { data: classes } = await sb.from('classes').select('id').eq('teacher_id', session.teacher_id);
  let students = [];
  if (classes?.length) {
    const ids = classes.map(c => c.id);
    const { data } = await sb.from('users').select('id,name,classes(name)').in('class_id', ids).eq('role','student').order('name');
    students = data || [];
  }
  // 학생별 최신 리포트
  const sIds = students.map(s => s.id);
  let reportMap = {};
  if (sIds.length) {
    const { data: reports } = await sb.from('weekly_reports').select('id,student_id,overall_comments,need_to_improve,is_sent').in('student_id', sIds).order('week_start', { ascending: false });
    (reports || []).forEach(r => { if (!reportMap[r.student_id]) reportMap[r.student_id] = r; });
  }
  return { props: { students, reportMap, teacherId: session.teacher_id } };
}

export default function ReportWritePage({ students, reportMap }) {
  const [reports, setReports] = useState(reportMap);
  const [saving, setSaving] = useState({});
  const [sending, setSending] = useState({});
  const [generating, setGenerating] = useState({});
  const [saved, setSaved] = useState({});
  const router = useRouter();

  async function generateAI(studentId) {
    setGenerating(p => ({ ...p, [studentId]: true }));
    const res = await fetch('/api/reports/generate-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json();
    if (res.ok) {
      setReports(p => ({ ...p, [studentId]: { ...(p[studentId] || {}), overall_comments: data.overall_comments, need_to_improve: data.need_to_improve } }));
    } else alert('AI 생성 실패: ' + (data.error || ''));
    setGenerating(p => ({ ...p, [studentId]: false }));
  }

  async function saveReport(studentId) {
    setSaving(p => ({ ...p, [studentId]: true }));
    const r = reports[studentId] || {};
    const res = await fetch('/api/reports/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, reportId: r.id, overall_comments: r.overall_comments || '', need_to_improve: r.need_to_improve || '' }),
    });
    const data = await res.json();
    if (res.ok) {
      setReports(p => ({ ...p, [studentId]: { ...r, id: data.id } }));
      setSaved(p => ({ ...p, [studentId]: true }));
      setTimeout(() => setSaved(p => ({ ...p, [studentId]: false })), 2000);
    } else alert('저장 실패');
    setSaving(p => ({ ...p, [studentId]: false }));
  }

  async function sendReport(studentId) {
    const r = reports[studentId];
    if (!r?.id) { alert('먼저 저장 버튼을 누르세요.'); return; }
    if (!confirm('이 학생의 리포트를 발송 완료로 처리할까요?')) return;
    setSending(p => ({ ...p, [studentId]: true }));
    const res = await fetch('/api/reports/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id }) });
    if (res.ok) setReports(p => ({ ...p, [studentId]: { ...r, is_sent: true } }));
    else alert('발송 처리 실패');
    setSending(p => ({ ...p, [studentId]: false }));
  }

  return (
    <>
      <Head><title>리포트 작성 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/teacher')} className="text-gray-400 text-sm">←</button>
              <span className="text-sm font-medium text-gray-900">리포트 작성</span>
            </div>
            <button onClick={() => router.push('/teacher/report/upload')} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">📊 엑셀 업로드</button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 pb-10 space-y-3">
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
            <strong>AI 자동 생성</strong>을 누르면 학생의 발음 데이터를 분석해 Rise 스타일 코멘트를 자동으로 만들어줍니다. 수정 후 저장·발송하세요.
          </div>

          {students.length === 0 && <p className="text-center text-sm text-gray-400 py-12">담당 학생이 없습니다.</p>}

          {students.map(student => {
            const r = reports[student.id] || {};
            const isSent = r.is_sent;
            return (
              <div key={student.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-sm font-semibold text-purple-700">{student.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.classes?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSent
                      ? <span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-lg">발송 완료</span>
                      : <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg">미발송</span>
                    }
                    {!isSent && (
                      <button onClick={() => generateAI(student.id)} disabled={generating[student.id]}
                        className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg disabled:opacity-50">
                        {generating[student.id] ? 'AI 생성 중...' : '✨ AI 생성'}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Overall Comments</label>
                  <textarea value={r.overall_comments || ''} onChange={e => setReports(p => ({ ...p, [student.id]: { ...r, overall_comments: e.target.value } }))}
                    rows={3} disabled={isSent}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="이번 달 학습 현황을 입력하세요..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Need to Improve</label>
                  <textarea value={r.need_to_improve || ''} onChange={e => setReports(p => ({ ...p, [student.id]: { ...r, need_to_improve: e.target.value } }))}
                    rows={2} disabled={isSent}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="다음 달 집중 계획을 입력하세요..." />
                </div>

                {!isSent && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveReport(student.id)} disabled={saving[student.id]}
                      className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${saved[student.id] ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'} disabled:opacity-50`}>
                      {saving[student.id] ? '저장 중...' : saved[student.id] ? '✓ 저장됨' : '임시 저장'}
                    </button>
                    <button onClick={() => sendReport(student.id)} disabled={sending[student.id] || !r.overall_comments}
                      className="flex-1 py-2 text-sm rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40">
                      {sending[student.id] ? '처리 중...' : '발송 완료로 변경'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
