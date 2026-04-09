export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, password } = req.body;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Supabase Auth에 계정 생성
  const authRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  const authData = await authRes.json();
  if (authData.error) return res.status(400).json({ error: authData.error.message });

  // users 테이블에 추가
  const userRes = await fetch(`${url}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ id: authData.id, name, email, role: 'teacher' })
  });
  const userData = await userRes.json();
  return res.status(200).json(userData);
}
