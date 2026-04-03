import { createServerClient } from '../../lib/supabase';

export default async function handler(req, res) {
  const sb = createServerClient();
  
  const { data: classes, error: e1 } = await sb
    .from('classes')
    .select('id,name,teacher_id')
    .limit(5);
    
  const { data: students, error: e2 } = await sb
    .from('users')
    .select('id,name,class_id,role')
    .eq('role','student')
    .limit(5);
    
  const { data: sessions, error: e3 } = await sb
    .from('teacher_sessions')
    .select('teacher_id,expires_at')
    .limit(3);

  return res.status(200).json({
    classes: classes || [],
    classesError: e1?.message,
    students: students || [],
    studentsError: e2?.message,
    sessions: sessions || [],
    sessionsError: e3?.message,
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });
}
```
