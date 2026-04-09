export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { id } = req.body;

  await fetch(`${url}/rest/v1/users?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    }
  });

  return res.status(200).json({ success: true });
}
