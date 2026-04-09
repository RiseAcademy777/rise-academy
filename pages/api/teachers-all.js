export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const [teachersRes, classesRes] = await Promise.all([
    fetch(`${url}/rest/v1/users?role=in.(teacher,director)&select=id,name,role&order=name`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    }),
    fetch(`${url}/rest/v1/classes?select=id,name,teacher_id&order=name`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    })
  ]);

  const teachers = await teachersRes.json();
  const classes = await classesRes.json();

  return res.status(200).json({ teachers: teachers || [], classes: classes || [] });
}
