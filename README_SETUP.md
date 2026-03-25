# Rise Language Academy · 웹 시스템 설치 가이드

---

## 전체 파일 구조

```
rise-final/
├── pages/
│   ├── login.js                  ← 강사/원장 로그인
│   ├── teacher/
│   │   ├── index.js              ← 강사 대시보드 (링크 관리)
│   │   ├── report/upload.js      ← 엑셀 업로드 → 학부모 발송
│   │   ├── notice.js             ← 공지사항 작성/발송
│   │   └── content.js            ← 이번 주 콘텐츠 확인
│   ├── admin/
│   │   ├── index.js              ← 원장 관리자 대시보드
│   │   └── schedule.js           ← 커리큘럼 일정·날짜 설정
│   ├── student/
│   │   └── practice.js           ← 학생 발음 녹음 화면
│   ├── r/[token]/
│   │   ├── index.js              ← 링크 유효성 확인
│   │   ├── verify.js             ← 학부모 본인 확인
│   │   └── report.js             ← 학부모 리포트 열람
│   └── api/
│       ├── auth/login.js         ← 강사 로그인 API
│       ├── auth/logout.js
│       ├── tokens/generate.js    ← 매직 링크 생성
│       ├── tokens/verify.js      ← 본인 확인
│       ├── reports/upload.js     ← 엑셀 파싱 API
│       ├── reports/send-bulk.js  ← 전체 발송
│       ├── notices/create.js     ← 공지 생성
│       ├── schedule/save.js      ← 일정 저장
│       ├── schedule/apply-now.js ← 즉시 적용
│       └── analyze/pronunciation.js ← AI 발음 분석
├── lib/
│   ├── supabase.js
│   └── utils.js
├── sql/
│   └── schema_final.sql          ← 전체 DB 스키마 (16개 테이블)
└── .env.example
```

---

## STEP 1 · Supabase 설정 (20분)

1. https://supabase.com 접속 → 무료 계정 생성
2. "New Project" 클릭 → 프로젝트 이름: `rise-academy`
3. 좌측 메뉴 **SQL Editor** → `sql/schema_final.sql` 전체 복사 → Run
4. **Authentication → Users** → Add user:
   - 원장님 이메일/비밀번호 입력
5. **Table Editor → users** 에서 해당 이메일 행 찾기:
   - `role` 컬럼: `director` 입력
6. **Settings → API** 에서 3개 값 복사:
   - Project URL
   - anon public key
   - service_role key (비밀!)

---

## STEP 2 · 학생 데이터 입력

**Table Editor → users** 에서 학생 한 명씩 추가:

| 컬럼 | 예시 |
|------|------|
| name | 박지우 |
| email | jiwoo@rise.com (임시) |
| role | student |
| class_id | (classes 테이블에서 UUID 복사) |
| date_of_birth | 2018-05-15 |

---

## STEP 3 · 커리큘럼 단원 입력

**Table Editor → curriculum_units** 에서 레벨별 단원 추가:

| level_code | unit_name | textbook_ref | week_number |
|------------|-----------|--------------|-------------|
| VP1 | Journeys 1.3 | Journeys Grade 1 | 1 |
| VP1 | Journeys 1.4 | Journeys Grade 1 | 2 |
| EP1 | Journeys 1.1 | Journeys Grade 1 | 1 |

---

## STEP 4 · 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일에 Supabase 값 3개 입력:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## STEP 5 · 로컬 테스트

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 → 원장님 이메일로 로그인

---

## STEP 6 · Vercel 배포

1. https://vercel.com 가입 (무료)
2. "Add New → Project" 클릭
3. `rise-final` 폴더 드래그해서 업로드
4. Environment Variables 탭에서 5개 입력:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_SITE_URL (배포 후 발급된 URL)
   - OPENAI_API_KEY (발음 분석용)
5. "Deploy" 클릭 → 1~2분 대기 → URL 발급

---

## STEP 7 · 첫 사용

1. 발급된 URL/login 접속 → 원장님 로그인
2. 학생 이름 옆 "링크 생성" 클릭
3. "복사" → 카카오톡으로 학부모 전송
4. 학부모: 링크 탭 → 자녀 이름 마지막 글자 + 생년월 입력 → 리포트 확인

---

## API 키 발급 방법

**OpenAI (발음 분석)**
1. https://platform.openai.com 가입
2. API Keys → Create new secret key
3. Vercel 환경변수 OPENAI_API_KEY에 입력
4. 결제 수단 등록 (월 $5~15 예상)

**Anthropic Claude (AI 리포트 자동 생성 - 선택)**
1. https://console.anthropic.com 가입
2. API Keys → Create Key
3. Vercel 환경변수 ANTHROPIC_API_KEY에 입력

---

## 자주 묻는 질문

**Q. 학부모가 링크를 잃어버렸어요**
강사 화면에서 해당 학생 "재발급" 버튼 클릭 → 새 링크 카카오 전송

**Q. 엑셀 양식이 달라도 되나요?**
학생별 시트 + Overall Comments + Need to Improve 구조면 자동 인식됩니다.

**Q. 발음 분석이 안 돼요**
iOS에서는 카카오톡 인앱 브라우저에서 마이크가 제한될 수 있습니다.
Safari로 열어달라는 안내 문구가 화면에 표시됩니다.

**Q. 월 비용이 얼마나 드나요?**
Vercel 무료 + Supabase 무료 + OpenAI 월 $5~15(학생 30명 기준) = 약 1~2만원
