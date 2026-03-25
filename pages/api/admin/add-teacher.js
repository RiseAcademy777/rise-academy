import { createServerClient } from '../../../lib/supabase';
import { validateTeacher } from '../../../lib/utils';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });

  // 원장 권한 확인
  const sb = createServerClient();
  const { data: me } = await sb.from('users').select('role').eq('id', session.teacher_id).single();
  if (me?.role !== 'director') return res.status(403).json({ error: '원장 권한이 필요합니다.' });

  const { name, email, role, class_id } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: '이름과 이메일을 입력해 주세요.' });

  // 임시 비밀번호 생성
  const tempPassword = crypto.randomBytes(5).toString('hex').toUpperCase();

  // Supabase Auth에 사용자 생성
  const { data: authUser, error: authError } = await sb.auth.admin.createUser({ email, password: tempPassword, email_confirm: true });
  if (authError) return res.status(400).json({ error: authError.message });

  // users 테이블에 추가
  const { error: userError } = await sb.from('users').insert({
    id: authUser.user.id,
    name,
    email,
    role: role || 'teacher',
    class_id: class_id || null,
  });
  if (userError) return res.status(500).json({ error: userError.message });

  return res.status(200).json({ ok: true, tempPassword });
}
