import { serialize } from 'cookie';
import { createServerClient } from '../../../lib/supabase';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const sessionKey = req.cookies['teacher_session'];
  if (sessionKey) { const sb = createServerClient(); await sb.from('teacher_sessions').delete().eq('session_key', sessionKey); }
  res.setHeader('Set-Cookie', serialize('teacher_session', '', { httpOnly: true, expires: new Date(0), path: '/' }));
  return res.status(200).json({ ok: true });
}
