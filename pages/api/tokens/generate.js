import crypto from 'crypto';
import { createServerClient } from '../../../lib/supabase';
import { validateTeacher } from '../../../lib/utils';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { studentId } = req.body || {};
  if (!studentId) return res.status(400).json({ error: 'studentId 필요' });
  const sb = createServerClient();
  const { data: student } = await sb.from('users').select('id,name').eq('id', studentId).eq('role','student').single();
  if (!student) return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
  await sb.from('parent_access_tokens').update({ is_active: false }).eq('student_id', studentId).eq('is_active', true);
  const newToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 86400000);
  const { data: created, error } = await sb.from('parent_access_tokens').insert({ student_id: studentId, token: newToken, expires_at: expiresAt.toISOString(), is_active: true, created_by: session.teacher_id }).select().single();
  if (error) return res.status(500).json({ error: '토큰 생성 실패' });
  return res.status(200).json({ token: created });
}
