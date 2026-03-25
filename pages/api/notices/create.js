import { createServerClient } from '../../../lib/supabase';
import { validateTeacher } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { category, target, title, body, schedule } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: '제목과 내용을 입력해 주세요.' });

  const sb = createServerClient();
  const isSent = schedule === 'now';

  const { data: notice, error } = await sb.from('notices').insert({
    teacher_id: session.teacher_id,
    category: category || 'general',
    class_id: target === 'all' ? null : target,
    title,
    body,
    is_sent: isSent,
    sent_at: isSent ? new Date().toISOString() : null,
  }).select().single();

  if (error) return res.status(500).json({ error: '공지 저장 실패' });

  // 실제 카카오톡 발송은 카카오 알림톡 API 또는 카카오 비즈니스 채널 연동 필요
  // 현재는 DB 저장 + 학부모가 링크 접속 시 확인하는 방식으로 동작
  // TODO: 카카오 알림톡 API 연동 시 여기서 발송 처리

  return res.status(200).json({ ok: true, notice });
}
