export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { name, teacher_id } = req.body;

  const response = await fetch(`${url}/rest/v1/classes`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ name, teacher_id: teacher_id || null })
  });
  const data = await response.json();
  return res.status(200).json(data);
}
