import { createServerClient } from '../../../lib/supabase';
import { validateTeacher, getThisMonday } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { students } = req.body || {};
  if (!students?.length) return res.status(400).json({ error: 'students 배열이 필요합니다.' });

  const sb = createServerClient();
  const weekStart = getThisMonday();
  const results = [];

  for (const s of students) {
    // 이름으로 학생 찾기
    const { data: student } = await sb.from('users').select('id').eq('name', s.name).eq('role', 'student').maybeSingle();
    if (!student) { results.push({ name: s.name, status: 'not_found' }); continue; }

    // 리포트 저장
    const { data: report } = await sb.from('weekly_reports').upsert({
      student_id: student.id,
      week_start: weekStart,
      overall_comments: s.overall_comments,
      need_to_improve: s.need_to_improve,
      skill_scores: s.skills,
      is_sent: true,
      sent_at: new Date().toISOString(),
    }).select('id').single();

    results.push({ name: s.name, status: 'sent', reportId: report?.id });
  }

  return res.status(200).json({ ok: true, results });
}
