export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { classId, teacherId } = req.body;

  const response = await fetch(`${url}/rest/v1/classes?id=eq.${classId}`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ teacher_id: teacherId })
  });

  const data = await response.json();
  return res.status(200).json(data);
}
