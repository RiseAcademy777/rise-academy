import Head from 'next/head';
import { gradeToPercent, gradeToColor } from '../../../lib/utils';

export async function getServerSideProps(ctx) {
  const { token } = ctx.params;
  const sessionKey = ctx.req.cookies[`ps_${token}`];
  if (!sessionKey) return { redirect: { destination: `/r/${token}`, permanent: false } };
  const { createServerClient } = await import('../../../lib/supabase');
  const sb = createServerClient();

  const { data: tokenData } = await sb.from('parent_access_tokens').select('id,student_id,expires_at').eq('token', token).eq('is_active', true).single();
  if (!tokenData || new Date(tokenData.expires_at) < new Date()) return { redirect: { destination: `/r/${token}`, permanent: false } };

  const { data: session } = await sb.from('token_sessions').select('id,expires_at').eq('session_key', sessionKey).eq('token_id', tokenData.id).single();
  if (!session || new Date(session.expires_at) < new Date()) return { redirect: { destination: `/r/${token}/verify`, permanent: false } };

  const { data: student } = await sb.from('users').select('id,name,class_id,classes(id,name,level_code)').eq('id', tokenData.student_id).single();
  const { data: report } = await sb.from('weekly_reports').select('*').eq('student_id', tokenData.student_id).eq('is_sent', true).order('week_start', { ascending: false }).limit(1).single();
  const { data: allReports } = await sb.from('weekly_reports').select('id,week_start,overall_comments').eq('student_id', tokenData.student_id).eq('is_sent', true).order('week_start', { ascending: false }).limit(6);
  const { data: dailyStats } = await sb.from('daily_stats').select('stat_date,pronunciation_score_avg,effort_index').eq('student_id', tokenData.student_id).order('stat_date', { ascending: false }).limit(8);
  const { data: phonemeErrors } = await sb.from('phoneme_errors').select('phoneme,error_count').eq('student_id', tokenData.student_id).order('error_count', { ascending: false }).limit(3);
  const { data: notices } = await sb.from('notices').select('id,title,category,created_at,body').eq('class_id', student?.class_id).eq('is_sent', true).order('created_at', { ascending: false }).limit(5);

  return { props: {
    student: student || null,
    report: report || null,
    allReports: allReports || [],
    dailyStats: (dailyStats || []).reverse(),
    phonemeErrors: phonemeErrors || [],
    notices: notices || [],
  }};
}

const SKILLS = ['Vocabulary', 'Reading', 'Grammar', 'Listening', 'Writing', 'Speaking'];
const SKILL_KO = { Vocabulary:'어휘', Reading:'읽기', Grammar:'문법', Listening:'듣기', Writing:'쓰기', Speaking:'말하기' };
const CAT_LABEL = { general:'📢 공지', homework:'📝 과제', event:'🎉 행사', urgent:'⚠️ 긴급', fee:'💰 납부', report:'📊 리포트' };

function ScoreChart({ data }) {
  if (!data?.length) return null;
  const max = 100;
  const h = 56;
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${h + 16}`} preserveAspectRatio="none" className="w-full h-16">
      {[25, 50, 75].map(y => <line key={y} x1="0" y1={h-(y/max)*h} x2="100" y2={h-(y/max)*h} stroke="#f0f0f0" strokeWidth="0.5"/>)}
      {data.map((d, i) => {
        const score = d.pronunciation_score_avg || 0;
        const barH = (score / max) * h;
        const x = i * w + w * 0.15;
        const isLast = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={h-barH} width={w*0.7} height={barH} rx="1.5" fill={isLast ? '#3B82F6' : '#BFDBFE'}/>
            {isLast && <text x={x+w*0.35} y={h-barH-3} textAnchor="middle" fontSize="5" fill="#1D4ED8" fontWeight="600">{Math.round(score)}</text>}
          </g>
        );
      })}
      {data.map((d, i) => {
        const date = new Date(d.stat_date);
        return <text key={i} x={i*w+w/2} y={h+12} textAnchor="middle" fontSize="4.5" fill="#9CA3AF">{`${date.getMonth()+1}/${date.getDate()}`}</text>;
      })}
    </svg>
  );
}

export default function ParentReport({ student, report, allReports, dailyStats, phonemeErrors, notices }) {
  if (!student) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-gray-400">리포트를 불러올 수 없습니다.</p></div>;

  const period = report?.week_start ? new Date(report.week_start).toLocaleDateString('ko-KR', { year:'numeric', month:'long' }) : '';
  const speakingMin = report?.speaking_duration_total ? Math.round(report.speaking_duration_total / 60) : null;

  return (
    <>
      <Head><title>{student.name} 학습 리포트 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-blue-700 px-4 pt-5 pb-4 text-white text-center">
          <p className="text-xs opacity-70 tracking-widest uppercase mb-1">Rise Language Academy</p>
          <h1 className="text-lg font-semibold">{student.name} 학습 리포트</h1>
          <p className="text-xs opacity-70 mt-1">{student.classes?.name} · {period}</p>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-4 pb-10">

          {/* 핵심 지표 */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label:'발음 점수', value: report?.pronunciation_avg ? Math.round(report.pronunciation_avg) : '-', unit:'점', sub:'/ 100점 만점', color:'blue' },
              { label:'이번 달 성장률', value: report?.growth_rate != null ? (report.growth_rate >= 0 ? `+${Math.round(report.growth_rate)}` : Math.round(report.growth_rate)) : '-', unit:'%', sub:'지난달 대비', color:'green' },
              { label:'총 발화 시간', value: speakingMin ?? '-', unit:'분', sub:'이번 달 누계', color:'purple' },
              { label:'노력 지수', value: report?.effort_index_avg ? Math.round(report.effort_index_avg) : '-', unit:'점', sub:'/ 100점 만점', color:'amber' },
            ].map((m, i) => {
              const bgCls = ['bg-blue-50','bg-green-50','bg-purple-50','bg-amber-50'][i];
              const textCls = ['text-blue-700','text-green-700','text-purple-700','text-amber-700'][i];
              return (
                <div key={i} className={`${bgCls} rounded-2xl p-4`}>
                  <p className={`text-xs font-medium ${textCls} opacity-70 mb-1.5`}>{m.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${textCls}`}>{m.value}</span>
                    <span className={`text-sm ${textCls} opacity-60`}>{m.unit}</span>
                  </div>
                  <p className={`text-xs mt-1 ${textCls} opacity-50`}>{m.sub}</p>
                </div>
              );
            })}
          </div>

          {/* 발음 점수 추이 */}
          {dailyStats.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-700">발음 점수 추이</p>
                <p className="text-xs text-gray-400">최근 {dailyStats.length}일</p>
              </div>
              <ScoreChart data={dailyStats} />
            </div>
          )}

          {/* 스킬 점수 (Excel 업로드된 경우) */}
          {report?.skill_scores && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-700 mb-3">Language Evaluation</p>
              <div className="grid grid-cols-3 gap-3">
                {SKILLS.map(skill => {
                  const grade = report.skill_scores?.[skill];
                  if (!grade) return null;
                  const color = gradeToColor(grade);
                  const pct = gradeToPercent(grade);
                  return (
                    <div key={skill} className="text-center">
                      <p className="text-xs text-gray-400 mb-1">{SKILL_KO[skill]}</p>
                      <p className="text-xl font-bold" style={{ color }}>{grade}</p>
                      <div className="h-1 bg-gray-100 rounded mt-1 overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 집중 연습 발음 */}
          {phonemeErrors.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-700 mb-3">집중 연습 발음 TOP {phonemeErrors.length}</p>
              <div className="flex gap-2 flex-wrap">
                {phonemeErrors.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                    <span className="text-lg font-bold text-orange-600 font-mono">{p.phoneme}</span>
                    <span className="text-xs text-orange-400">{p.error_count}회 오류</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI / 강사 코멘트 */}
          {(report?.overall_comments || report?.need_to_improve) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
              {report.overall_comments && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><div className="w-0.5 h-4 bg-blue-400 rounded"/><p className="text-xs font-medium text-gray-500">이번 달 학습 현황</p></div>
                  <p className="text-sm text-gray-700 leading-relaxed">{report.overall_comments}</p>
                </div>
              )}
              {report.need_to_improve && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><div className="w-0.5 h-4 bg-amber-400 rounded"/><p className="text-xs font-medium text-gray-500">다음 달 집중 계획</p></div>
                  <p className="text-sm text-gray-700 leading-relaxed">{report.need_to_improve}</p>
                </div>
              )}
            </div>
          )}

          {/* 공지사항 */}
          {notices.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-700 mb-3">공지사항</p>
              <div className="space-y-2">
                {notices.map(n => (
                  <div key={n.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5">{CAT_LABEL[n.category] || '공지'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 이전 리포트 */}
          {allReports.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-700 mb-3">이전 리포트</p>
              <div className="space-y-2">
                {allReports.slice(1).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <p className="text-sm text-gray-700">{new Date(r.week_start).toLocaleDateString('ko-KR', { year:'numeric', month:'long' })}</p>
                    <span className="text-xs text-gray-400">확인 →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!report && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-500">아직 발송된 리포트가 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">리포트가 준비되면 카카오톡으로 안내해 드립니다.</p>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-xs text-gray-300">Rise Language Academy · 라이즈어학원</p>
            <p className="text-xs text-gray-300">051-623-0582 · 부산 수영구 남천동</p>
          </div>
        </div>
      </div>
    </>
  );
}
