import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '../../../lib/supabase';
import { validateTeacher } from '../../../lib/utils';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `당신은 Rise Language Academy의 학부모 소통 전문가입니다.
학생의 영어 발음 학습 데이터를 받아 학부모에게 전달할 월간 성장 리포트를 작성합니다.

[Rise 어학원 리포트 스타일]
- 문장 시작: "[이름]은/는 이번 달 ~" 또는 "[이름]이/가 ~" 형식
- 진행 언어: "~하고 있습니다", "~이 늘어나고 있습니다", "~을 이어가고 있습니다"
- Overall 마무리: "전반적으로 [이름]은 ~한 성장을 보여주고 있습니다."
- Need to Improve: "다음 달에는 ~에 집중할 예정입니다." 패턴

[절대 규칙]
1. 단정적 부정 표현 금지 ("못한다", "안된다", "문제가 있다")
2. 타 학생 비교 금지
3. 2섹션(overall_comments, need_to_improve)으로만 출력
4. overall_comments: 3~4문장, 수치 포함
5. need_to_improve: 2~3문장, 구체적 발음 포함, 긍정 마무리
6. 순수 JSON만 응답

[출력 JSON]
{"overall_comments":"3~4문장","need_to_improve":"2~3문장"}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await validateTeacher(req);
  if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const { studentId } = req.body || {};
  if (!studentId) return res.status(400).json({ error: 'studentId 필요' });

  const sb = createServerClient();

  // 학생 정보
  const { data: student } = await sb.from('users').select('id,name,classes(name,level_code)').eq('id', studentId).single();
  if (!student) return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });

  // 이번 달 stats
  const firstDay = new Date(); firstDay.setDate(1);
  const { data: stats } = await sb.from('daily_stats').select('pronunciation_score_avg,effort_index,attempt_count,speaking_duration_total').eq('student_id', studentId).gte('stat_date', firstDay.toISOString().split('T')[0]);

  const avgScore = stats?.length ? Math.round(stats.reduce((s, r) => s + (r.pronunciation_score_avg || 0), 0) / stats.length) : null;
  const totalMin = stats?.length ? Math.round(stats.reduce((s, r) => s + (r.speaking_duration_total || 0), 0) / 60) : null;
  const totalAttempts = stats?.length ? stats.reduce((s, r) => s + (r.attempt_count || 0), 0) : null;

  // 이전 달 stats
  const prevFirst = new Date(); prevFirst.setMonth(prevFirst.getMonth() - 1); prevFirst.setDate(1);
  const prevLast = new Date(); prevLast.setDate(0);
  const { data: prevStats } = await sb.from('daily_stats').select('pronunciation_score_avg').eq('student_id', studentId).gte('stat_date', prevFirst.toISOString().split('T')[0]).lte('stat_date', prevLast.toISOString().split('T')[0]);
  const prevAvg = prevStats?.length ? Math.round(prevStats.reduce((s, r) => s + (r.pronunciation_score_avg || 0), 0) / prevStats.length) : null;
  const growthRate = (avgScore && prevAvg) ? Math.round((avgScore - prevAvg) / prevAvg * 100) : null;

  // 오류 발음 TOP 3
  const { data: phonemes } = await sb.from('phoneme_errors').select('phoneme,error_count').eq('student_id', studentId).order('error_count', { ascending: false }).limit(3);

  const userMsg = `학생: ${student.name} | 레벨: ${student.classes?.name} (${student.classes?.level_code})
발음 점수 평균: ${avgScore ?? 'N/A'}점 | 지난달: ${prevAvg ?? 'N/A'}점 | 성장률: ${growthRate != null ? growthRate + '%' : 'N/A'}
총 발화 시간: ${totalMin ?? 'N/A'}분 | 연습 횟수: ${totalAttempts ?? 'N/A'}회
오류 발음: ${(phonemes || []).map(p => `${p.phoneme}(${p.error_count}회)`).join(', ') || '데이터 없음'}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    return res.status(200).json(parsed);
  } catch (e) {
    console.error('Claude API error:', e);
    return res.status(500).json({ error: 'AI 생성 실패. API 키를 확인해 주세요.' });
  }
}
