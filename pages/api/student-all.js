import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data } = await sb.from('users').select('id,name,class_id,classes(id,name)').eq('role','student').order('name');
  return res.status(200).json({ students: data || [] });
}
