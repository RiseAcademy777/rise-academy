import { useRouter } from 'next/router';
import Head from 'next/head';

export async function getServerSideProps(ctx) {
  const { validateTeacher, getThisMonday } = await import('../../lib/utils');
  const session = await validateTeacher(ctx.req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { createServerClient } = await import('../../lib/supabase');
  const sb = createServerClient();
  const { data: classes } = await sb.from('classes').select('id,name,level_code').eq('teacher_id', session.teacher_id);
  const thisMonday = getThisMonday();
  let schedules = [];
  if (classes?.length) {
    const ids = classes.map(c => c.id);
    const { data } = await sb.from('weekly_schedule').select('*,curriculum_units(unit_name,textbook_ref)').in('class_id', ids).eq('week_start', thisMonday).eq('is_active', true);
    schedules = data || [];
  }
  // 이번 주 문장·단어
  let sentences = [], vocab = [];
  if (schedules.length) {
    const unitIds = schedules.map(s => s.unit_id).filter(Boolean);
    if (unitIds.length) {
      const { data: sents } = await sb.from('unit_sentences').select('sentences(text,target_phonemes)').in('unit_id', unitIds).order('order_index').limit(10);
      sentences = (sents || []).map(s => s.sentences).filter(Boolean);
      const { data: voc } = await sb.from('unit_vocab').select('word,meaning_ko,example_sentence').in('unit_id', unitIds).limit(15);
      vocab = voc || [];
    }
  }
  return { props: { classes: classes || [], schedules, sentences, vocab, thisMonday } };
}

export default function ContentPage({ classes, schedules, sentences, vocab, thisMonday }) {
  const router = useRouter();
  const dateLabel = new Date(thisMonday).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  return (
    <>
      <Head><title>이번 주 콘텐츠 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push('/teacher')} className="text-gray-400 text-sm">←</button>
            <div>
              <p className="text-sm font-medium text-gray-900">이번 주 콘텐츠</p>
              <p className="text-xs text-gray-400">{dateLabel} 주차</p>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 pb-10 space-y-4">
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-3">이번 주 단원이 설정되지 않았습니다.</p>
              <button onClick={() => router.push('/admin/schedule')} className="text-sm px-4 py-2 bg-gray-900 text-white rounded-lg">일정 설정하기</button>
            </div>
          ) : (
            <>
              {schedules.map(s => (
                <div key={s.id} className="bg-blue-50 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">{classes.find(c => c.id === s.class_id)?.name}</p>
                  <p className="text-sm font-semibold text-blue-900">{s.curriculum_units?.unit_name || '단원 정보 없음'}</p>
                  {s.curriculum_units?.textbook_ref && <p className="text-xs text-blue-600 mt-0.5">{s.curriculum_units.textbook_ref}</p>}
                </div>
              ))}

              {sentences.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-gray-700">발음 연습 문장</p>
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-lg">자동 설정</span>
                  </div>
                  <div className="space-y-2">
                    {sentences.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                        <div className="flex gap-1 flex-shrink-0 mt-0.5">
                          {(s.target_phonemes || []).slice(0, 2).map(p => (
                            <span key={p} className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-mono font-semibold">{p}</span>
                          ))}
                        </div>
                        <p className="text-sm text-gray-800 italic">"{s.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {vocab.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-gray-700">이번 주 단어</p>
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-lg">{vocab.length}개 자동</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vocab.map((v, i) => (
                      <span key={i} className="text-xs bg-gray-50 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg">{v.word} <span className="text-gray-400">· {v.meaning_ko}</span></span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
