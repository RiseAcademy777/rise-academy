export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = await fetch(`${url}/rest/v1/classes?select=id,name&order=name`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    }
  });

  const data = await response.json();
  return res.status(200).json({ classes: data || [] });
}
