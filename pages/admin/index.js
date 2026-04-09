import { useRouter } from 'next/router';
import Head from 'next/head';

export async function getServerSideProps(ctx) {
  const { validateTeacher } = await import('../../lib/utils');
  const session = await validateTeacher(ctx.req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { createServerClient } = await import('../../lib/supabase');
  const sb = createServerClient();
  const { data: teacher } = await sb.from('users').select('role,name').eq('id', session.teacher_id).single();
  if (!['director','teacher'].includes(teacher?.role)) return { redirect: { destination: '/teacher', permanent: false } };
  const { count: studentCount } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
  const { count: sentCount } = await sb.from('weekly_reports').select('*', { count: 'exact', head: true }).eq('is_sent', true);
  return { props: { teacher, studentCount: studentCount || 0, sentCount: sentCount || 0 } };
}

export default function AdminDashboard({ teacher, studentCount, sentCount }) {
  const router = useRouter();
  const menus = [
    { label: '커리큘럼 일정', desc: '단원·날짜 설정', icon: '📅', href: '/admin/schedule' },
    { label: '콘텐츠 관리', desc: '문장·단어 관리', icon: '📚', href: '/admin/content' },
    { label: '강사 관리', desc: '계정·클래스 배정', icon: '👩‍🏫', href: '/admin/teachers' },
    { label: '전체 현황', desc: '학생·리포트 통계', icon: '📊', href: '/admin/stats' },
  ];
  return (
    <>
      <Head><title>관리자 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Rise Language Academy</p>
              <p className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
   onClick={() => router.push('/')}>{teacher?.name} 원장님 · 관리자</p>
            </div>
            <button onClick={() => router.push('/teacher')} className="text-xs text-blue-600">강사 화면</button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 pb-10 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-semibold text-blue-600">{studentCount}</p>
              <p className="text-xs text-gray-400 mt-1">전체 학생</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-semibold text-green-600">{sentCount}</p>
              <p className="text-xs text-gray-400 mt-1">발송 완료 리포트</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {menus.map(m => (
              <button key={m.href} onClick={() => router.push(m.href)}
                className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 transition-colors">
                <div className="text-2xl mb-2">{m.icon}</div>
                <p className="text-sm font-medium text-gray-900">{m.label}</p>
                <p className="text-xs text-gray-400">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
