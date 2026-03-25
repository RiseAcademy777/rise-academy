import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { gradeToPercent, gradeToColor } from '../../../lib/utils';

export async function getServerSideProps(ctx) {
  const { validateTeacher } = await import('../../../lib/utils');
  const session = await validateTeacher(ctx.req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { createServerClient } = await import('../../../lib/supabase');
  const sb = createServerClient();
  const { data: classes } = await sb.from('classes').select('id,name').eq('teacher_id', session.teacher_id);
  return { props: { teacherId: session.teacher_id, classes: classes || [] } };
}

const SKILLS = ['Vocabulary', 'Reading', 'Grammar', 'Listening', 'Writing', 'Speaking'];
const SKILL_KO = { Vocabulary: '어휘', Reading: '읽기', Grammar: '문법', Listening: '듣기', Writing: '쓰기', Speaking: '말하기' };

export default function ReportUpload({ classes }) {
  const [step, setStep] = useState('upload'); // upload | parsed | preview | sent
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const router = useRouter();

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/reports/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok && data.students) {
      setStudents(data.students);
      setSelected(data.students[0]);
      setStep('parsed');
    } else {
      alert(data.error || '파일 파싱 실패. 양식을 확인해 주세요.');
    }
    setUploading(false);
  }

  async function sendAll() {
    setSending(true);
    const res = await fetch('/api/reports/send-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    });
    if (res.ok) setStep('sent');
    else alert('발송 실패. 다시 시도해 주세요.');
    setSending(false);
  }

  return (
    <>
      <Head><title>리포트 업로드 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push('/teacher')} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
            <span className="text-sm font-medium text-gray-900">월간 리포트 업로드</span>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 pb-10">

          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
                기존에 작성하시던 <strong>MK_Violet_3월_Report.xlsx</strong> 양식 그대로 올리세요. 학생별 시트를 자동으로 인식합니다.
              </div>
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-2xl">📊</div>
                <p className="text-sm font-medium text-gray-900 mb-1">{uploading ? '파일 분석 중...' : '엑셀 파일 드래그 또는 클릭'}</p>
                <p className="text-xs text-gray-400">학생별 시트 구조 자동 인식 · .xlsx / .xls 지원</p>
                {!uploading && <button className="mt-4 text-xs px-4 py-2 bg-gray-900 text-white rounded-lg">파일 선택하기</button>}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-500 space-y-1.5">
                <p className="font-medium text-gray-700 mb-2">지원 양식 조건</p>
                {['학생별 시트 구조 (Yuju, Joy...)', 'Language Evaluation 6개 스킬 (A+~C)', 'Overall Comments / Need to Improve', '교사명·레벨·기간 정보'].map(t => (
                  <p key={t} className="flex gap-2"><span className="text-green-600">✓</span>{t}</p>
                ))}
              </div>
            </div>
          )}

          {(step === 'parsed' || step === 'preview') && students.length > 0 && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl px-4 py-3 text-xs text-green-700">
                <strong>{students.length}명</strong> 학생 리포트 인식 완료 · 미리보기 확인 후 발송하세요
              </div>

              {/* 학생 탭 */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {students.map(s => (
                  <button key={s.name} onClick={() => { setSelected(s); setStep('preview'); }}
                    className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap flex-shrink-0 transition-colors ${selected?.name === s.name ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {s.name}
                  </button>
                ))}
              </div>

              {/* 리포트 미리보기 */}
              {selected && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {/* 헤더 */}
                  <div className="bg-blue-700 px-5 py-4 text-white text-center">
                    <p className="text-xs opacity-70 tracking-widest uppercase mb-1">Rise Language Academy</p>
                    <p className="text-lg font-semibold">{selected.name} 학습 리포트</p>
                    <p className="text-xs opacity-75 mt-0.5">{selected.level} · {selected.period}</p>
                  </div>

                  {/* 스킬 점수 */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-400 mb-3">Language Evaluation</p>
                    <div className="grid grid-cols-3 gap-4">
                      {SKILLS.map(skill => {
                        const grade = selected.skills?.[skill] || '-';
                        const pct = gradeToPercent(grade);
                        const color = gradeToColor(grade);
                        return (
                          <div key={skill} className="text-center">
                            <p className="text-xs text-gray-400 mb-1">{SKILL_KO[skill]}</p>
                            <p className="text-xl font-bold" style={{ color }}>{grade}</p>
                            <div className="h-1 bg-gray-100 rounded mt-1.5 overflow-hidden">
                              <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* 등급 범례 */}
                    <div className="flex gap-1.5 flex-wrap mt-3 justify-center">
                      {['C','C+','B-','B','B+','A','A+'].map(g => (
                        <span key={g} className={`text-xs px-2 py-0.5 rounded border ${SKILLS.some(s => selected.skills?.[s] === g) ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'border-gray-200 text-gray-400'}`}>{g}</span>
                      ))}
                    </div>
                  </div>

                  {/* 코멘트 */}
                  <div className="px-5 py-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-0.5 h-4 bg-blue-500 rounded" />
                        <p className="text-xs font-medium text-gray-500">Overall Comments</p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{selected.overall_comments}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-0.5 h-4 bg-amber-400 rounded" />
                        <p className="text-xs font-medium text-gray-500">Need to Improve</p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{selected.need_to_improve}</p>
                    </div>
                  </div>

                  {/* 교사 */}
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
                    {selected.teachers?.map(t => (
                      <div key={t} className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-700">{t[0]}</div>
                        <span className="text-xs text-gray-500">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep('upload')} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">다시 업로드</button>
                <button onClick={sendAll} disabled={sending}
                  className="flex-1 py-2.5 text-sm bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50">
                  {sending ? '발송 중...' : `💬 ${students.length}명 전체 카카오 발송`}
                </button>
              </div>
            </div>
          )}

          {step === 'sent' && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-lg font-semibold text-gray-900 mb-2">발송 완료!</p>
              <p className="text-sm text-gray-500 mb-6">{students.length}명의 학부모에게 리포트 링크가 전송되었습니다.</p>
              <button onClick={() => router.push('/teacher')} className="text-sm px-6 py-2.5 bg-gray-900 text-white rounded-xl">대시보드로 돌아가기</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
