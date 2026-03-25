import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function VocabPage() {
  const [mode, setMode] = useState('flash'); // flash | quiz | result
  const [words, setWords] = useState([]);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]); // {word, know: bool}
  const [quizAnswered, setQuizAnswered] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 이번 주 단어 로드
    fetch('/api/content/this-week-vocab')
      .then(r => r.json())
      .then(data => { setWords(data.vocab || DEMO_WORDS); setLoading(false); })
      .catch(() => { setWords(DEMO_WORDS); setLoading(false); });
  }, []);

  // 데모용 단어
  const DEMO_WORDS = [
    { word: 'rabbit', meaning_ko: '토끼', example_sentence: 'The rabbit ran really fast.' },
    { word: 'river', meaning_ko: '강', example_sentence: 'The river flows quietly.' },
    { word: 'friend', meaning_ko: '친구', example_sentence: 'She is my best friend.' },
    { word: 'brave', meaning_ko: '용감한', example_sentence: 'The brave boy helped his friend.' },
    { word: 'school', meaning_ko: '학교', example_sentence: 'I love going to school.' },
  ];

  const w = words[current];
  const progress = Math.round(((current) / Math.max(words.length, 1)) * 100);

  function nextWord(know) {
    const newResults = [...results, { word: w.word, know }];
    setResults(newResults);
    setRevealed(false);
    if (current + 1 >= words.length) {
      setMode('result');
    } else {
      setCurrent(c => c + 1);
    }
  }

  function getQuizChoices(correctWord) {
    const others = words.filter(w2 => w2.word !== correctWord.word).sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [correctWord, ...others].sort(() => Math.random() - 0.5);
    return choices;
  }

  function restart() {
    setCurrent(0); setResults([]); setRevealed(false); setQuizAnswered(null); setMode('flash');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" /></div>;

  const knowCount = results.filter(r => r.know).length;
  const unknownWords = results.filter(r => !r.know);

  return (
    <>
      <Head><title>단어 학습 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-sm mx-auto">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-900">단어 학습</p>
            <p className="text-xs text-gray-400">{Math.min(current + 1, words.length)} / {words.length}</p>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* 모드 선택 */}
        <div className="flex gap-1.5 px-4 py-3 bg-white border-b border-gray-100">
          {[{ id: 'flash', label: '플래시카드' }, { id: 'quiz', label: '퀴즈' }].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); restart(); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${mode === m.id && mode !== 'result' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex-1 px-4 py-6 flex flex-col gap-4">

          {/* 플래시카드 모드 */}
          {mode === 'flash' && w && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-3">
                <p className="text-xs text-gray-400">오늘의 단어 · 탭해서 뜻 확인</p>
                <p className="text-4xl font-bold text-gray-900">{w.word}</p>
                <p className="text-sm text-gray-400 font-mono">/{w.word}/</p>

                <div className={`transition-all duration-300 ${revealed ? 'opacity-100' : 'opacity-0 blur-sm cursor-pointer'}`} onClick={() => setRevealed(true)}>
                  <div className="bg-blue-50 rounded-xl px-4 py-3 mt-2">
                    <p className="text-lg font-semibold text-blue-800">{w.meaning_ko}</p>
                  </div>
                  {w.example_sentence && (
                    <p className="text-xs text-gray-500 italic mt-3">"{w.example_sentence}"</p>
                  )}
                </div>

                {!revealed && (
                  <button onClick={() => setRevealed(true)} className="text-xs text-blue-500 mt-2">탭해서 뜻 확인 →</button>
                )}
              </div>

              {revealed && (
                <div className="flex gap-3">
                  <button onClick={() => nextWord(false)}
                    className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium">
                    😅 어려워요
                  </button>
                  <button onClick={() => nextWord(true)}
                    className="flex-1 py-3 bg-green-50 text-green-600 border border-green-200 rounded-xl text-sm font-medium">
                    😊 알아요!
                  </button>
                </div>
              )}

              {!revealed && (
                <button onClick={() => setRevealed(true)} className="py-3 bg-gray-900 text-white rounded-xl text-sm font-medium">뜻 확인하기</button>
              )}
            </>
          )}

          {/* 퀴즈 모드 */}
          {mode === 'quiz' && w && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                <p className="text-xs text-gray-400 mb-3">뜻을 보고 단어를 고르세요</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{w.meaning_ko}</p>
                {w.example_sentence && <p className="text-xs text-gray-400 italic">{w.example_sentence.replace(new RegExp(w.word, 'i'), '______')}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {getQuizChoices(w).map((choice, i) => {
                  const isCorrect = choice.word === w.word;
                  const isSelected = quizAnswered !== null;
                  let btnCls = 'border-gray-200 bg-white text-gray-700 hover:border-blue-300';
                  if (isSelected) {
                    if (isCorrect) btnCls = 'border-green-400 bg-green-50 text-green-700';
                    else if (quizAnswered === i) btnCls = 'border-red-400 bg-red-50 text-red-700';
                    else btnCls = 'border-gray-100 bg-gray-50 text-gray-400';
                  }
                  return (
                    <button key={choice.word} disabled={isSelected}
                      onClick={() => {
                        setQuizAnswered(i);
                        setTimeout(() => {
                          nextWord(isCorrect);
                          setQuizAnswered(null);
                        }, 800);
                      }}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${btnCls}`}>
                      {choice.word}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* 결과 화면 */}
          {mode === 'result' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                <div className="text-4xl mb-3">{knowCount >= words.length * 0.8 ? '🎉' : knowCount >= words.length * 0.5 ? '😊' : '💪'}</div>
                <p className="text-xs text-gray-400 mb-2">오늘의 단어 학습 결과</p>
                <p className="text-4xl font-bold text-green-600">{Math.round((knowCount / words.length) * 100)}<span className="text-xl font-normal text-gray-400">점</span></p>
                <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(knowCount / words.length) * 100}%` }} />
                </div>
                <div className="flex justify-center gap-4 mt-3 text-xs text-gray-400">
                  <span>✓ 알아요 <strong className="text-green-600">{knowCount}개</strong></span>
                  <span>✗ 어려워요 <strong className="text-red-500">{words.length - knowCount}개</strong></span>
                </div>
              </div>

              {unknownWords.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-600 mb-3">다시 복습할 단어</p>
                  <div className="space-y-2">
                    {unknownWords.map(r => {
                      const wData = words.find(w => w.word === r.word);
                      return (
                        <div key={r.word} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <div><p className="text-sm font-medium text-gray-900">{r.word}</p><p className="text-xs text-gray-400">{wData?.meaning_ko}</p></div>
                          <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">재학습</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={restart} className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium">다시 학습하기</button>
              <button onClick={() => window.location.href = '/student/practice'}
                className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl text-sm">발음 연습으로 이동 →</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
