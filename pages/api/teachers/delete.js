export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const { id } = req.body;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Auth 계정 삭제
  await fetch(`${url}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });

  // users 테이블에서 삭제
  await fetch(`${url}/rest/v1/users?id=eq.${id}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });

  return res.status(200).json({ success: true });
}
