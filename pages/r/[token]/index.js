export async function getServerSideProps(ctx) {
  const { token } = ctx.params;
  const sessionKey = ctx.req.cookies[`ps_${token}`];
  const { createServerClient } = await import('../../../lib/supabase');
  const sb = createServerClient();
  const { data: tokenData } = await sb.from('parent_access_tokens').select('id,expires_at,is_active').eq('token', token).eq('is_active', true).single();
  if (!tokenData) return { props: { status: 'invalid' } };
  if (new Date(tokenData.expires_at) < new Date()) return { props: { status: 'expired' } };
  if (sessionKey) {
    const { data: session } = await sb.from('token_sessions').select('id,expires_at').eq('session_key', sessionKey).eq('token_id', tokenData.id).single();
    if (session && new Date(session.expires_at) > new Date()) return { redirect: { destination: `/r/${token}/report`, permanent: false } };
  }
  return { redirect: { destination: `/r/${token}/verify`, permanent: false } };
}

import Head from 'next/head';
export default function TokenEntry({ status }) {
  return (
    <>
      <Head><title>Rise Language Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-2xl">🔗</div>
          <h1 className="text-base font-semibold text-gray-900 mb-2">
            {status === 'expired' ? '링크가 만료되었습니다' : '유효하지 않은 링크입니다'}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {status === 'expired' ? '담당 선생님께 새 링크를 요청해 주세요.' : '카카오톡에서 받은 링크 전체를 복사해 주세요.'}
          </p>
          <p className="text-xs text-gray-300 mt-6">Rise Language Academy · 라이즈어학원</p>
        </div>
      </div>
    </>
  );
}
