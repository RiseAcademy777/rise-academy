import formidable from 'formidable';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { createServerClient } from '../../../lib/supabase';
import { validateTeacher } from '../../../lib/utils';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  let fields, files;
  try {
    [fields, files] = await new Promise((resolve, reject) => form.parse(req, (err, f, fi) => err ? reject(err) : resolve([f, fi])));
  } catch { return res.status(400).json({ error: '파일 업로드 실패' }); }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  const type = Array.isArray(fields.type) ? fields.type[0] : fields.type; // 'sentences' | 'vocab'
  if (!file) return res.status(400).json({ error: '파일이 없습니다.' });

  try {
    const buffer = fs.readFileSync(file.filepath);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const sb = createServerClient();
    let count = 0;

    if (type === 'vocab') {
      // 단원 이름으로 unit_id 매핑
      const { data: units } = await sb.from('curriculum_units').select('id,unit_name');
      const unitMap = {};
      (units || []).forEach(u => { unitMap[u.unit_name] = u.id; });

      const vocabRows = rows.map(r => ({
        unit_id: unitMap[r.unit_name] || null,
        word: String(r.word || '').trim(),
        meaning_ko: String(r.meaning_ko || '').trim(),
        example_sentence: String(r.example || r.example_sentence || '').trim(),
        difficulty: parseInt(r.difficulty) || 2,
      })).filter(r => r.word && r.unit_id);

      if (vocabRows.length) {
        const { error } = await sb.from('unit_vocab').insert(vocabRows);
        if (error) throw error;
        count = vocabRows.length;
      }
    } else {
      // 문장 업로드
      const sentRows = rows.map(r => ({
        text: String(r.text || '').trim(),
        level_code: String(r.level_code || r.level || '').trim(),
        target_phonemes: String(r.phonemes || r.target_phonemes || '').split(',').map(p => p.trim()).filter(Boolean),
        difficulty_level: parseInt(r.difficulty) || 2,
        category: String(r.category || '').trim() || null,
      })).filter(r => r.text);

      if (sentRows.length) {
        const { error } = await sb.from('sentences').insert(sentRows);
        if (error) throw error;
        count = sentRows.length;
      }
    }

    return res.status(200).json({ ok: true, count });
  } catch (e) {
    console.error('CSV upload error:', e);
    return res.status(500).json({ error: '파일 처리 실패: ' + e.message });
  }
}
