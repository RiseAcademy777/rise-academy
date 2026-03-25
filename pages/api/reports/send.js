import { createServerClient } from '../../../lib/supabase';
import { validateTeacher } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { reportId } = req.body || {};
  if (!reportId) return res.status(400).json({ error: 'reportId 필요' });
  const sb = createServerClient();
  const { error } = await sb.from('weekly_reports').update({ is_sent: true, sent_at: new Date().toISOString() }).eq('id', reportId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
