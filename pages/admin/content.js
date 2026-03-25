import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export async function getServerSideProps(ctx) {
  const { validateTeacher } = await import('../../lib/utils');
  const session = await validateTeacher(ctx.req);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { createServerClient } = await import('../../lib/supabase');
  const sb = createServerClient();
  const { data: sentences } = await sb.from('sentences').select('id,text,target_phonemes,level_code,difficulty_level').order('level_code').order('difficulty_level').limit(50);
  const { data: units } = await sb.from('curriculum_units').select('id,level_code,unit_name').order('level_code').order('week_number');
  const { count: sentCount } = await sb.from('sentences').select('*', { count: 'exact', head: true });
  const { count: vocabCount } = await sb.from('unit_vocab').select('*', { count: 'exact', head: true });
  return { props: { sentences: sentences || [], units: units || [], sentCount: sentCount || 0, vocabCount: vocabCount || 0 } };
}

const LEVELS = ['FP1','FP3','FP4','VP1','VP2','EP1','EP2','EP3','EP4','EP5','EP6'];

export default function ContentManagement({ sentences, units, sentCount, vocabCount }) {
  const [tab, setTab] = useState('sentences');
  const [filterLevel, setFilterLevel] = useState('all');
  const [newSent, setNewSent] = useState({ text: '', level_code: 'VP1', target_phonemes: '', difficulty_level: 2 });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const router = useRouter();

  const filtered = filterLevel === 'all' ? sentences : sentences.filter(s => s.level_code === filterLevel);

  async function addSentence() {
    if (!newSent.text) return;
    setSaving(true);
    const phonemes = newSent.target_phonemes.split(',').map(p => p.trim()).filter(Boolean);
    const res = await fetch('/api/content/add-sentence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newSent, target_phonemes: phonemes }),
    });
    if (res.ok) {
      alert('문장이 추가되었습니다!');
      setNewSent({ text: '', level_code: 'VP1', target_phonemes: '', difficulty_level: 2 });
      router.reload();
    } else alert('추가 실패');
    setSaving(false);
  }

  async function handleCSV(file) {
    if (!file) return;
    setUploading(true); setUploadResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', tab);
    const res = await fetch('/api/content/upload-csv', { method: 'POST', body: fd });
    const data = await res.json();
    setUploadResult(data);
    setUploading(false);
    if (res.ok) setTimeout(() => router.reload(), 1500);
  }

  return (
    <>
      <Head><title>콘텐츠 관리 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm">←</button>
            <span className="text-sm font-medium text-gray-900">콘텐츠 관리</span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 pb-10 space-y-4">
          {/* 통계 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-semibold text-blue-600">{sentCount}</p>
              <p className="text-xs text-gray-400 mt-1">발음 연습 문장</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-semibold text-green-600">{vocabCount}</p>
              <p className="text-xs text-gray-400 mt-1">등록된 단어</p>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
            {[{ id: 'sentences', label: '📝 발음 문장' }, { id: 'vocab', label: '📖 단어' }, { id: 'upload', label: '📤 CSV 업로드' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-3 text-xs font-medium transition-colors ${tab === t.id ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* 문장 탭 */}
          {tab === 'sentences' && (
            <div className="space-y-3">
              {/* 레벨 필터 */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setFilterLevel('all')} className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap flex-shrink-0 ${filterLevel === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>전체</button>
                {LEVELS.map(lv => (
                  <button key={lv} onClick={() => setFilterLevel(lv)} className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap flex-shrink-0 ${filterLevel === lv ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>{lv}</button>
                ))}
              </div>

              {/* 새 문장 추가 */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-xs font-medium text-gray-700">새 문장 추가</p>
                <input value={newSent.text} onChange={e => setNewSent(p => ({ ...p, text: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder='예: "The rabbit ran really fast."' />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">레벨</label>
                    <select value={newSent.level_code} onChange={e => setNewSent(p => ({ ...p, level_code: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
                      {LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">발음 (쉼표)</label>
                    <input value={newSent.target_phonemes} onChange={e => setNewSent(p => ({ ...p, target_phonemes: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                      placeholder="r, th" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">난이도</label>
                    <select value={newSent.difficulty_level} onChange={e => setNewSent(p => ({ ...p, difficulty_level: +e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={addSentence} disabled={saving || !newSent.text}
                  className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-40">
                  {saving ? '추가 중...' : '+ 문장 추가'}
                </button>
              </div>

              {/* 문장 목록 */}
              <div className="space-y-2">
                {filtered.map(s => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-start gap-3">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5">{s.level_code}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 italic truncate">"{s.text}"</p>
                      <div className="flex gap-1 mt-1">
                        {(s.target_phonemes || []).map(p => (
                          <span key={p} className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-mono">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-6">해당 레벨의 문장이 없습니다.</p>}
              </div>
            </div>
          )}

          {/* 단어 탭 */}
          {tab === 'vocab' && (
            <div className="space-y-3">
              <div className="bg-amber-50 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
                단어는 단원(unit)에 연결됩니다. 단원을 먼저 설정하고 단어를 추가해 주세요.
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-xs font-medium text-gray-700">새 단어 추가</p>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">단원 선택...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.level_code} · {u.unit_name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="단어 (영어)" />
                  <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="뜻 (한국어)" />
                </div>
                <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder='예문: "The rabbit ran fast."' />
                <button className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm">+ 단어 추가</button>
              </div>
              <p className="text-xs text-gray-400 text-center">대량 입력은 아래 CSV 업로드를 이용하세요</p>
            </div>
          )}

          {/* CSV 업로드 탭 */}
          {tab === 'upload' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
                제가 만들어드린 <strong>Rise_EP_Content_DB.xlsx</strong> 파일을 CSV로 변환해서 올리거나,<br/>
                아래 형식에 맞게 직접 만들어 올리시면 됩니다.
              </div>

              {/* 문장 CSV 형식 */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">발음 문장 CSV 형식</p>
                <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 leading-relaxed overflow-x-auto">
                  text,level_code,phonemes,difficulty<br/>
                  "The rabbit ran fast",VP1,"r,th",2<br/>
                  "She sells seashells",EP1,"sh,s",3<br/>
                  "Three thin sticks",FP3,"th",1
                </div>
              </div>

              {/* 단어 CSV 형식 */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">단어 CSV 형식</p>
                <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 leading-relaxed overflow-x-auto">
                  unit_name,word,meaning_ko,example<br/>
                  "Journeys 1.3",rabbit,토끼,"The rabbit ran fast."<br/>
                  "Journeys 1.3",river,강,"The river is deep."
                </div>
              </div>

              {/* 업로드 영역 */}
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleCSV(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => handleCSV(e.target.files[0])} />
                <div className="text-2xl mb-2">📤</div>
                <p className="text-sm font-medium text-gray-900">{uploading ? '업로드 중...' : 'CSV 파일 드래그 또는 클릭'}</p>
                <p className="text-xs text-gray-400 mt-1">.csv 또는 .xlsx 지원</p>
              </div>

              {uploadResult && (
                <div className={`rounded-xl px-4 py-3 text-xs ${uploadResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {uploadResult.ok ? `✓ ${uploadResult.count}개 항목이 추가되었습니다.` : `오류: ${uploadResult.error}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
