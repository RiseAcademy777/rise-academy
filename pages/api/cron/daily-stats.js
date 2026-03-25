// Vercel Cron Job · 매일 자정 실행
// vercel.json 설정: "schedule": "0 15 * * *" (KST 자정 = UTC 15시)

import { createServerClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  // Vercel Cron은 Authorization 헤더로 검증
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sb = createServerClient();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  // 어제 녹음한 모든 학생 목록
  const { data: activeStudents } = await sb.from('recordings').select('student_id').eq('recorded_at::date', dateStr).not('student_id', 'is', null);
  const studentIds = [...new Set((activeStudents || []).map(r => r.student_id))];

  let processed = 0;
  for (const studentId of studentIds) {
    // 어제 녹음 데이터 집계
    const { data: recs } = await sb.from('recordings').select('pronunciation_score,intonation_score,speaking_duration_sec').eq('student_id', studentId).gte('recorded_at', `${dateStr}T00:00:00`).lte('recorded_at', `${dateStr}T23:59:59`);

    if (!recs?.length) continue;

    const pronAvg = recs.reduce((s, r) => s + (r.pronunciation_score || 0), 0) / recs.length;
    const intonAvg = recs.reduce((s, r) => s + (r.intonation_score || 0), 0) / recs.length;
    const speakingTotal = recs.reduce((s, r) => s + (r.speaking_duration_sec || 0), 0);

    // 세션 횟수
    const { count: attemptCount } = await sb.from('practice_sessions').select('*', { count: 'exact', head: true }).eq('student_id', studentId).eq('session_date', dateStr);

    // 노력 지수 계산 (횟수 40% + 발화시간 35% + 참여도 25%)
    const maxAttempts = 10, maxSpeaking = 600; // 기준값
    const effortIndex = Math.min(100, Math.round(
      (Math.min(attemptCount || 0, maxAttempts) / maxAttempts * 40) +
      (Math.min(speakingTotal, maxSpeaking) / maxSpeaking * 35) +
      (pronAvg / 100 * 25)
    ));

    await sb.from('daily_stats').upsert({
      student_id: studentId,
      stat_date: dateStr,
      pronunciation_score_avg: Math.round(pronAvg * 100) / 100,
      intonation_score_avg: Math.round(intonAvg * 100) / 100,
      speaking_duration_total: speakingTotal,
      attempt_count: attemptCount || 0,
      effort_index: effortIndex,
      aggregated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,stat_date' });

    processed++;
  }

  return res.status(200).json({ ok: true, date: dateStr, processed });
}
