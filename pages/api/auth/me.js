import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const cookieHeader = req.headers.cookie || '';
  let sessionKey = '';
  cookieHeader.split(';').forEach(c => {
    const parts = c.trim().split('=');
    if (parts[0] === 'teacher_session') sessionKey = parts.slice(1).join('=');
  });
  if (!sessionKey) return res.status(401).json({ error: 'no session' });
  const { data: sess } = await sb.from('teacher_sessions').select('teacher_id').eq('session_key', sessionKey).maybeSingle();
  if (!sess) return res.status(401).json({ error: 'invalid session' });
  const { data: teacher } = await sb.from('users').select('id,name,role').eq('id', sess.teacher_id).maybeSingle();
  return res.status(200).json({ teacher });
}
