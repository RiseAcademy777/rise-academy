import { createServerClient } from '../../../lib/supabase';
import { validateTeacher } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { text, level_code, target_phonemes, difficulty_level } = req.body || {};
  if (!text) return res.status(400).json({ error: '문장 내용이 필요합니다.' });
  const sb = createServerClient();
  const { data, error } = await sb.from('sentences').insert({ text, level_code, target_phonemes: target_phonemes || [], difficulty_level: difficulty_level || 2 }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ sentence: data });
}
