import { createServerClient } from './supabase';

export async function validateTeacher(req) {
  const cookies = req.cookies || {};
  const sessionKey = cookies['teacher_session'];
  if (!sessionKey) return null;
  
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('teacher_sessions')
    .select('teacher_id, expires_at')
    .eq('session_key', sessionKey)
    .single();
    
  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  
  return data;
}

export function getThisMonday() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}

export function gradeToPercent(grade) {
  const map = { 'A+': 100, 'A': 90, 'B+': 75, 'B': 60, 'B-': 48, 'C+': 35, 'C': 20 };
  return map[grade] || 60;
}

export function gradeToColor(grade) {
  const map = { 'A+': '#7C3AED', 'A': '#6D28D9', 'B+': '#1D4ED8', 'B': '#0F6E56', 'B-': '#B45309', 'C+': '#DC2626', 'C': '#9CA3AF' };
  return map[grade] || '#888';
}
