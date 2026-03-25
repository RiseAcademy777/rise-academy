import formidable from 'formidable';
import * as XLSX from 'xlsx';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

const SKILLS = ['Vocabulary', 'Reading', 'Grammar', 'Listening', 'Writing', 'Speaking'];

function parseSheet(ws) {
  const rows = [];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z50');
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? cell.v : null);
    }
    rows.push(row);
  }
  return rows;
}

function extractData(rows, sheetName) {
  const flat = rows.map(r => r.filter(Boolean));
  let name = sheetName, level = '', period = '', teachers = [], skills = {}, overall = '', improve = '';

  for (const row of rows) {
    const vals = row.filter(Boolean);
    for (let i = 0; i < row.length; i++) {
      const v = row[i];
      if (v === "Student's Name :" && row[i+1]) name = String(row[i+1]).trim();
      if (v === 'Level :' && row[i+1]) level = String(row[i+1]).trim();
      if (v === 'Period :' && row[i+1]) period = String(row[i+1]).trim();
      if (v === 'Teachers :' && row[i+1]) teachers.push(String(row[i+1]).trim());
      if (v === 'Luna Teacher' || v === 'Luna teacher') teachers.push(String(v).trim());
    }

    // 스킬 점수 파싱
    for (const skill of SKILLS) {
      const re = new RegExp(skill, 'i');
      if (vals.some(v => re.test(String(v)))) {
        const gradeIdx = vals.findIndex(v => /^[ABC][+-]?$/.test(String(v)));
        if (gradeIdx >= 0) skills[skill] = String(vals[gradeIdx]);
      }
    }
  }

  // Overall Comments & Need to Improve
  let inOverall = false, inImprove = false;
  for (const row of rows) {
    const vals = row.filter(Boolean);
    if (!vals.length) continue;
    const line = vals.join(' ');
    if (/Overall Comments/i.test(line)) { inOverall = true; inImprove = false; continue; }
    if (/Need to Improve/i.test(line)) { inOverall = false; inImprove = true; continue; }
    if (/PHONE|ADDRESS|Campus|051-/i.test(line)) { inOverall = false; inImprove = false; continue; }
    const text = vals.filter(v => String(v).length > 10).join(' ').trim();
    if (inOverall && text) overall += (overall ? ' ' : '') + text;
    if (inImprove && text) improve += (improve ? ' ' : '') + text;
  }

  teachers = [...new Set(teachers.filter(t => t && t !== 'Teachers :'))];

  return { name, level, period, teachers, skills, overall_comments: overall.trim(), need_to_improve: improve.trim() };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  let files;
  try {
    [, files] = await new Promise((resolve, reject) => form.parse(req, (err, fields, files) => err ? reject(err) : resolve([fields, files])));
  } catch { return res.status(400).json({ error: '파일 업로드 실패' }); }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: '파일이 없습니다.' });

  try {
    const buffer = fs.readFileSync(file.filepath);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const students = wb.SheetNames.filter(n => !['Sheet1','Sheet2','Overview'].includes(n)).map(sheetName => {
      const ws = wb.Sheets[sheetName];
      const rows = parseSheet(ws);
      return extractData(rows, sheetName);
    }).filter(s => s.name);

    if (!students.length) return res.status(400).json({ error: '학생 데이터를 찾을 수 없습니다. 파일 양식을 확인해 주세요.' });
    return res.status(200).json({ students, count: students.length });
  } catch (e) {
    console.error('Excel parse error:', e);
    return res.status(500).json({ error: '파일 파싱 실패: ' + e.message });
  }
}
