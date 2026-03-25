import { createServerClient } from '../../../lib/supabase';
import { validateTeacher, getThisMonday } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { studentId, reportId, overall_comments, need_to_improve } = req.body || {};
  if (!studentId) return res.status(400).json({ error: 'studentId 필요' });
  const sb = createServerClient();
  const weekStart = getThisMonday();
  let result;
  if (reportId) {
    const { data, error } = await sb.from('weekly_reports').update({ overall_comments, need_to_improve }).eq('id', reportId).eq('is_sent', false).select('id').single();
    if (error) return res.status(500).json({ error: error.message });
    result = data;
  } else {
    const { data, error } = await sb.from('weekly_reports').upsert({ student_id: studentId, week_start: weekStart, overall_comments, need_to_improve, is_sent: false }).select('id').single();
    if (error) return res.status(500).json({ error: error.message });
    result = data;
  }
  return res.status(200).json({ id: result.id });
}
