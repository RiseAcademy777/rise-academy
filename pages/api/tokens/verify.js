import { serialize } from 'cookie';
import crypto from 'crypto';
import { createServerClient } from '../../../lib/supabase';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { token, lastChar, birthMonth } = req.body || {};
  if (!token || !lastChar || !birthMonth) return res.status(400).json({ error: '모든 항목을 입력해 주세요.' });
  const sb = createServerClient();
  const { data: tokenData } = await sb.from('parent_access_tokens').select('id,expires_at,is_active,student_id').eq('token', token).eq('is_active', true).single();
  if (!tokenData) return res.status(404).json({ error: '유효하지 않은 링크입니다.' });
  if (new Date(tokenData.expires_at) < new Date()) return res.status(400).json({ error: '링크가 만료되었습니다. 선생님께 새 링크를 요청해 주세요.' });
  const { data: student } = await sb.from('users').select('id,name,date_of_birth').eq('id', tokenData.student_id).single();
  if (!student) return res.status(404).json({ error: '학생 정보를 찾을 수 없습니다.' });
  if (lastChar !== student.name.slice(-1)) return res.status(400).json({ error: '입력한 정보가 일치하지 않습니다.' });
  if (student.date_of_birth) {
    const dob = new Date(student.date_of_birth);
    const expected = `${dob.getFullYear()}${String(dob.getMonth()+1).padStart(2,'0')}`;
    if (birthMonth !== expected) return res.status(400).json({ error: '입력한 정보가 일치하지 않습니다.' });
  }
  const sessionKey = crypto.randomBytes(32).toString('hex');
  const sessionExpires = new Date(Date.now() + 30 * 86400000);
  await sb.from('token_sessions').insert({ token_id: tokenData.id, session_key: sessionKey, expires_at: sessionExpires.toISOString() });
  res.setHeader('Set-Cookie', serialize(`ps_${token}`, sessionKey, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: sessionExpires, path: '/' }));
  return res.status(200).json({ ok: true });
}
