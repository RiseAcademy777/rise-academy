import { createServerClient } from '../../../lib/supabase';
import { getThisMonday } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { studentId } = req.query;
  if (!studentId) return res.status(200).json({ vocab: [] });

  const sb = createServerClient();
  const thisMonday = getThisMonday();

  // 학생의 클래스 조회
  const { data: student } = await sb.from('users').select('class_id').eq('id', studentId).single();
  if (!student?.class_id) return res.status(200).json({ vocab: [] });

  // 이번 주 스케줄
  const { data: schedule } = await sb.from('weekly_schedule').select('unit_id').eq('class_id', student.class_id).eq('is_active', true).lte('week_start', thisMonday).order('week_start', { ascending: false }).limit(1).single();

  if (!schedule?.unit_id) return res.status(200).json({ vocab: [] });

  // 이번 주 단어
  const { data: vocab } = await sb.from('unit_vocab').select('word,meaning_ko,example_sentence,difficulty').eq('unit_id', schedule.unit_id).order('difficulty').limit(20);

  return res.status(200).json({ vocab: vocab || [] });
}
