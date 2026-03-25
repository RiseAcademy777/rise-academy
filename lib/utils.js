import { createServerClient } from './supabase';

// 강사 세션 검증
export async function validateTeacher(req) {
  const sessionKey = req.cookies['teacher_session'];
  if (!sessionKey) return null;
  const supabase = createServerClient();
  const { data } = await supabase
    .from('teacher_sessions')
    .select('teacher_id, expires_at, users(id, name, role)')
    .eq('session_key', sessionKey)
    .single();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data;
}

// 이번 주 월요일 날짜 반환
export function getThisMonday() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}

// 등급 → 퍼센트
export function gradeToPercent(grade) {
  const map = { 'A+': 100, 'A': 90, 'B+': 75, 'B': 60, 'B-': 48, 'C+': 35, 'C': 20 };
  return map[grade] || 60;
}

// 등급 → 색상
export function gradeToColor(grade) {
  const map = { 'A+': '#7C3AED', 'A': '#6D28D9', 'B+': '#1D4ED8', 'B': '#0F6E56', 'B-': '#B45309', 'C+': '#DC2626', 'C': '#9CA3AF' };
  return map[grade] || '#888';
}
