import { serialize } from 'cookie';
import crypto from 'crypto';
import { createServerClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호를 입력해 주세요.' });
  
  const sb = createServerClient();
  
  const { data: authData, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !authData?.user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  
  const { data: user, error: userError } = await sb
    .from('users')
    .select('id,name,role')
    .eq('id', authData.user.id)
    .single();
    
  if (userError || !user) return res.status(403).json({ error: '사용자 정보를 찾을 수 없습니다.' });
  if (!['teacher','director'].includes(user.role)) return res.status(403).json({ error: '강사 또는 원장 계정만 로그인 가능합니다.' });
  
  const sessionKey = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  
  await sb.from('teacher_sessions').insert({ teacher_id: user.id, session_key: sessionKey, expires_at: expiresAt.toISOString() });
  
  res.setHeader('Set-Cookie', serialize('teacher_session', sessionKey, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: expiresAt, path: '/' }));
  return res.status(200).json({ ok: true, name: user.name, role: user.role });
}
