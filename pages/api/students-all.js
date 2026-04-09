export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    return res.status(500).json({ error: 'env missing', hasUrl: !!url, hasKey: !!key });
  }

  const response = await fetch(`${url}/rest/v1/users?role=eq.student&select=id,name,class_id&order=name`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Accept': 'application/json',
    }
  });
  
  const data = await response.json();
  return res.status(200).json({ students: data || [], count: Array.isArray(data) ? data.length : 0 });
}
