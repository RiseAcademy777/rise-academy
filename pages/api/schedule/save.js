import { createServerClient } from '../../../lib/supabase';
import { validateTeacher } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { id, unit_id, week_start, class_id } = req.body || {};
  const sb = createServerClient();

  if (id) {
    const { data, error } = await sb.from('weekly_schedule').update({ unit_id, week_start }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: '저장 실패' });
    return res.status(200).json({ schedule: data });
  } else {
    const { data, error } = await sb.from('weekly_schedule').insert({ class_id, unit_id, week_start, is_active: true }).select().single();
    if (error) return res.status(500).json({ error: '저장 실패' });
    return res.status(200).json({ schedule: data });
  }
}
