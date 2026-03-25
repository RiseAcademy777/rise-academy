import { useRouter } from 'next/router';
import Head from 'next/head';

export async function getServerSideProps(ctx) {
  const { validateTeacher } = await import('../../lib/utils');
  const session = await validateTeacher(ctx.req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { createServerClient } = await import('../../lib/supabase');
  const sb = createServerClient();

  const [
    { count: studentCount },
    { count: reportSentCount },
    { count: noticeSentCount },
    { count: recordingCount },
    { data: topPhonemes },
    { data: recentActivity },
  ] = await Promise.all([
    sb.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    sb.from('weekly_reports').select('*', { count: 'exact', head: true }).eq('is_sent', true),
    sb.from('notices').select('*', { count: 'exact', head: true }).eq('is_sent', true),
    sb.from('recordings').select('*', { count: 'exact', head: true }),
    sb.from('phoneme_errors').select('phoneme, error_count').order('error_count', { ascending: false }).limit(5),
    sb.from('weekly_reports').select('student_id, week_start, pronunciation_avg, users(name)').eq('is_sent', true).order('sent_at', { ascending: false }).limit(8),
  ]);

  return { props: {
    stats: { studentCount: studentCount || 0, reportSentCount: reportSentCount || 0, noticeSentCount: noticeSentCount || 0, recordingCount: recordingCount || 0 },
    topPhonemes: topPhonemes || [],
    recentActivity: recentActivity || [],
  }};
}

export default function StatsPage({ stats, topPhonemes, recentActivity }) {
  const router = useRouter();
  const cards = [
    { label: '전체 학생', value: stats.studentCount, color: 'blue' },
    { label: '발송된 리포트', value: stats.reportSentCount, color: 'green' },
    { label: '발송된 공지', value: stats.noticeSentCount, color: 'amber' },
    { label: '총 녹음 횟수', value: stats.recordingCount, color: 'purple' },
  ];
  const textColors = { blue: 'text-blue-600', green: 'text-green-600', amber: 'text-amber-600', purple: 'text-purple-600' };

  return (
    <>
      <Head><title>전체 현황 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm">←</button>
            <span className="text-sm font-medium text-gray-900">전체 현황</span>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 pb-10 space-y-4">

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 gap-3">
            {cards.map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className={`text-2xl font-semibold ${textColors[c.color]}`}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* 오류 발음 TOP 5 */}
          {topPhonemes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-700 mb-3">전체 학생 오류 발음 TOP 5</p>
              <div className="space-y-2">
                {topPhonemes.map((p, i) => (
                  <div key={p.phoneme} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <span className="text-base font-bold text-orange-600 font-mono w-8">{p.phoneme}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, (p.error_count / (topPhonemes[0]?.error_count || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{p.error_count}회</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 최근 발송 리포트 */}
          {recentActivity.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-700 mb-3">최근 발송된 리포트</p>
              <div className="space-y-2">
                {recentActivity.map(r => (
                  <div key={r.student_id + r.week_start} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-700">{r.users?.name?.charAt(0)}</div>
                      <span className="text-sm text-gray-800">{r.users?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.pronunciation_avg && <span className="text-xs text-blue-600 font-medium">{Math.round(r.pronunciation_avg)}점</span>}
                      <span className="text-xs text-gray-400">{new Date(r.week_start).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
