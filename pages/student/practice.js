import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

// 학생 화면은 토큰 기반 접근 또는 별도 학생 세션으로 접근
// 데모용으로 query param student_id 사용
export default function PracticePage() {
  const [step, setStep] = useState('ready'); // ready | recording | analyzing | result
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState(null);
  const [sentence, setSentence] = useState({ text: 'The rabbit ran really fast.', phonemes: ['r', 'th'] });
  const [waveHeights, setWaveHeights] = useState(Array(12).fill(6));
  const mediaRef = useRef();
  const chunksRef = useRef([]);
  const timerRef = useRef();
  const waveRef = useRef();

  function startWave() {
    waveRef.current = setInterval(() => {
      setWaveHeights(Array(12).fill(0).map(() => Math.floor(Math.random() * 36) + 6));
    }, 80);
  }
  function stopWave() { clearInterval(waveRef.current); setWaveHeights(Array(12).fill(6)); }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data);
      mediaRef.current.onstop = handleStop;
      mediaRef.current.start();
      setStep('recording'); setTimer(0);
      startWave();
      timerRef.current = setInterval(() => setTimer(t => { if (t >= 30) { stopRecording(); return t; } return t + 1; }), 1000);
    } catch { alert('마이크 접근이 필요합니다. Safari로 열어주세요.'); }
  }

  function stopRecording() {
    clearInterval(timerRef.current); stopWave();
    mediaRef.current?.stop();
    mediaRef.current?.stream?.getTracks().forEach(t => t.stop());
    setStep('analyzing');
  }

  async function handleStop() {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const fd = new FormData();
    fd.append('audio', blob, 'recording.webm');
    fd.append('sentence', sentence.text);
    fd.append('phonemes', JSON.stringify(sentence.phonemes));
    try {
      const res = await fetch('/api/analyze/pronunciation', { method: 'POST', body: fd });
      const data = await res.json();
      setResult(data);
    } catch {
      // 데모용 mock 결과
      setResult({ pronunciationScore: 72, intonationScore: 68, speechRateWpm: 88, errors: [{ phoneme: 'r', word: 'rabbit', severity: 'high' }, { phoneme: 'th', word: 'The', severity: 'medium' }], correct: ['fast', 'ran'] });
    }
    setStep('result');
  }

  const scoreColor = result?.pronunciationScore >= 80 ? '#16A34A' : result?.pronunciationScore >= 60 ? '#2563EB' : '#DC2626';

  return (
    <>
      <Head><title>발음 연습 · Rise Academy</title><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/></Head>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">오늘의 발음 연습</p>
          <p className="text-xs text-gray-400">3 / 5</p>
        </div>
        <div className="h-0.5 bg-gray-100"><div className="h-full bg-blue-500" style={{ width: '60%' }} /></div>

        <div className="flex-1 flex flex-col items-center justify-between px-4 py-6 gap-6 max-w-sm mx-auto w-full">

          {/* 문장 카드 */}
          <div className="w-full bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <p className="text-xs text-gray-400 mb-3">이번 문장</p>
            <p className="text-xl font-semibold text-gray-900 leading-snug mb-3">"{sentence.text}"</p>
            <div className="flex justify-center gap-2">
              {sentence.phonemes.map(p => <span key={p} className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg font-mono font-bold">{p}</span>)}
            </div>
          </div>

          {/* 중앙 영역 */}
          <div className="flex flex-col items-center gap-5 w-full">
            {/* 파형 */}
            <div className="flex items-center justify-center gap-1 h-12">
              {waveHeights.map((h, i) => (
                <div key={i} className="w-1.5 rounded-full transition-all duration-75" style={{ height: h, background: step === 'recording' ? '#3B82F6' : '#E5E7EB' }} />
              ))}
            </div>

            {step === 'analyzing' && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-600">AI 분석 중... (3초)</p>
              </div>
            )}

            {/* 타이머 */}
            {step === 'recording' && (
              <p className="text-3xl font-bold text-gray-900 font-mono">0:{String(timer).padStart(2, '0')}</p>
            )}

            {/* 녹음 버튼 */}
            {(step === 'ready' || step === 'recording') && (
              <button
                onClick={step === 'ready' ? startRecording : stopRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${step === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-gray-900'}`}>
                {step === 'recording' ? (
                  <div className="w-7 h-7 bg-white rounded-lg" />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="3" width="6" height="11" rx="3" fill="white"/>
                    <path d="M5 11c0 3.866 3.134 7 7 7s7-3.134 7-7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            )}

            <p className="text-xs text-gray-400">{step === 'ready' ? '버튼을 눌러 녹음 시작' : step === 'recording' ? '멈추려면 다시 누르세요' : ''}</p>
          </div>

          {/* 결과 */}
          {step === 'result' && result && (
            <div className="w-full space-y-3">
              {/* 점수 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-xs text-gray-400 mb-2">이번 발음 점수</p>
                <p className="text-5xl font-bold mb-1" style={{ color: scoreColor }}>{result.pronunciationScore}</p>
                <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${result.pronunciationScore}%`, background: scoreColor, transition: 'width 1s' }} />
                </div>
                <div className="flex justify-center gap-3 mt-3 text-xs text-gray-400">
                  <span>억양 {result.intonationScore}점</span>
                  <span>·</span>
                  <span>발화속도 {result.speechRateWpm} wpm</span>
                </div>
              </div>

              {/* 오류 발음 */}
              {result.errors?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-600 mb-3">틀린 발음</p>
                  <div className="space-y-2">
                    {result.errors.map((e, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-base font-bold text-orange-600 font-mono w-8">{e.phoneme}</span>
                        <span className="text-sm text-gray-700 flex-1">"{e.word}"</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${e.severity === 'high' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                          {e.severity === 'high' ? '주의' : '보통'}
                        </span>
                      </div>
                    ))}
                    {result.correct?.map((w, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-base text-green-600 w-8">✓</span>
                        <span className="text-sm text-green-700">"{w}" 정확</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-2">
                <button onClick={() => { setStep('ready'); setResult(null); }} className="flex-1 py-3 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">다시 연습</button>
                <button onClick={() => { setStep('ready'); setResult(null); }} className="flex-1 py-3 text-sm bg-gray-900 text-white rounded-xl font-medium">다음 문장 →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
