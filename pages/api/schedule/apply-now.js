import { createServerClient } from '../../../lib/supabase';
import { validateTeacher, getThisMonday } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { scheduleId } = req.body || {};
  if (!scheduleId) return res.status(400).json({ error: 'scheduleId 필요' });
  const sb = createServerClient();
  const today = new Date().toISOString().split('T')[0];
  const { error } = await sb.from('weekly_schedule').update({ week_start: today, is_active: true }).eq('id', scheduleId);
  if (error) return res.status(500).json({ error: '즉시 적용 실패' });
  return res.status(200).json({ ok: true });
}
