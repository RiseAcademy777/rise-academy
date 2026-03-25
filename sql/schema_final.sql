-- ============================================================
-- Rise Language Academy · Full Schema v2.0
-- PostgreSQL 14+ · Supabase SQL Editor에 붙여넣고 실행
-- ============================================================

-- 1. classes
CREATE TABLE IF NOT EXISTS classes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  level_code   VARCHAR(50)  NOT NULL,
  program      VARCHAR(50)  CHECK (program IN ('kindergarten','after_school')),
  teacher_id   UUID,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. users
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('student','parent','teacher','director')),
  parent_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  class_id      UUID         REFERENCES classes(id) ON DELETE SET NULL,
  date_of_birth DATE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE classes ADD CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX        IF NOT EXISTS idx_users_class   ON users(class_id) WHERE class_id IS NOT NULL;

-- 3. curriculum_units (레벨별 단원 마스터)
CREATE TABLE IF NOT EXISTS curriculum_units (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level_code    VARCHAR(50)  NOT NULL,
  unit_name     VARCHAR(200) NOT NULL,
  textbook_ref  VARCHAR(200),
  week_number   INT,
  academic_year INT          DEFAULT EXTRACT(YEAR FROM now())::INT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 4. weekly_schedule (클래스별 주차 일정 · 날짜 지정)
CREATE TABLE IF NOT EXISTS weekly_schedule (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  unit_id     UUID        REFERENCES curriculum_units(id) ON DELETE SET NULL,
  week_start  DATE        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  override_by UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedule_class_date ON weekly_schedule(class_id, week_start DESC);

-- 5. sentences (발음 연습 문장)
CREATE TABLE IF NOT EXISTS sentences (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text             TEXT        NOT NULL,
  difficulty_level SMALLINT   NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  target_phonemes  JSONB       NOT NULL DEFAULT '[]',
  category         VARCHAR(50),
  level_code       VARCHAR(50),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sentences_phonemes_gin ON sentences USING GIN (target_phonemes);
CREATE INDEX IF NOT EXISTS idx_sentences_level        ON sentences(level_code);

-- 6. unit_sentences (단원-문장 연결)
CREATE TABLE IF NOT EXISTS unit_sentences (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     UUID     NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  sentence_id UUID     NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  order_index INT      DEFAULT 0,
  is_required BOOLEAN  DEFAULT true,
  UNIQUE (unit_id, sentence_id)
);

-- 7. unit_vocab (단원 단어)
CREATE TABLE IF NOT EXISTS unit_vocab (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id          UUID        NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  word             VARCHAR(100) NOT NULL,
  meaning_ko       VARCHAR(200),
  example_sentence TEXT,
  difficulty       SMALLINT    DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unit_vocab_unit ON unit_vocab(unit_id);

-- 8. practice_sessions
CREATE TABLE IF NOT EXISTS practice_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sentence_id   UUID        REFERENCES sentences(id) ON DELETE SET NULL,
  session_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  duration_sec  INT         DEFAULT 0,
  attempt_count SMALLINT   NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sessions_student_date ON practice_sessions(student_id, session_date DESC);

-- 9. recordings
CREATE TABLE IF NOT EXISTS recordings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID        REFERENCES practice_sessions(id) ON DELETE CASCADE,
  student_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audio_url             TEXT,
  pronunciation_score   NUMERIC(5,2) CHECK (pronunciation_score BETWEEN 0 AND 100),
  intonation_score      NUMERIC(5,2) CHECK (intonation_score BETWEEN 0 AND 100),
  speech_rate_wpm       NUMERIC(6,2),
  speaking_duration_sec INT         DEFAULT 0,
  ai_raw_result         JSONB,
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recordings_student ON recordings(student_id, recorded_at DESC);

-- 10. phoneme_errors
CREATE TABLE IF NOT EXISTS phoneme_errors (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recording_id UUID        REFERENCES recordings(id) ON DELETE SET NULL,
  phoneme      VARCHAR(20) NOT NULL,
  error_word   VARCHAR(100),
  error_count  INT         NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, phoneme)
);
CREATE INDEX IF NOT EXISTS idx_phoneme_errors_student ON phoneme_errors(student_id, error_count DESC);

-- error_count 증분 함수
CREATE OR REPLACE FUNCTION increment_phoneme_error(p_student_id UUID, p_phoneme TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE phoneme_errors
  SET error_count = error_count + 1, last_seen_at = now()
  WHERE student_id = p_student_id AND phoneme = p_phoneme;
END;
$$;

-- 11. daily_stats
CREATE TABLE IF NOT EXISTS daily_stats (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stat_date               DATE        NOT NULL,
  pronunciation_score_avg NUMERIC(5,2),
  intonation_score_avg    NUMERIC(5,2),
  speaking_duration_total INT         DEFAULT 0,
  attempt_count           SMALLINT    DEFAULT 0,
  effort_index            NUMERIC(5,2) CHECK (effort_index BETWEEN 0 AND 100),
  aggregated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, stat_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_student_date ON daily_stats(student_id, stat_date DESC);

-- 12. weekly_reports
CREATE TABLE IF NOT EXISTS weekly_reports (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start              DATE        NOT NULL,
  pronunciation_avg       NUMERIC(5,2),
  intonation_avg          NUMERIC(5,2),
  growth_rate             NUMERIC(6,2),
  speaking_duration_total INT         DEFAULT 0,
  effort_index_avg        NUMERIC(5,2),
  skill_scores            JSONB,       -- Excel 업로드 시 A+~C 등급
  overall_comments        TEXT,
  need_to_improve         TEXT,
  is_sent                 BOOLEAN     NOT NULL DEFAULT FALSE,
  sent_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_weekly_student ON weekly_reports(student_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_unsent  ON weekly_reports(is_sent, week_start) WHERE is_sent = FALSE;

-- 13. notices (공지사항)
CREATE TABLE IF NOT EXISTS notices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    UUID        REFERENCES classes(id) ON DELETE SET NULL,
  category    VARCHAR(30) NOT NULL DEFAULT 'general'
              CHECK (category IN ('general','homework','event','urgent','fee','report')),
  title       VARCHAR(200) NOT NULL,
  body        TEXT        NOT NULL,
  is_sent     BOOLEAN     NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notices_class ON notices(class_id, created_at DESC);

-- 14. teacher_sessions
CREATE TABLE IF NOT EXISTS teacher_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_key TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_key ON teacher_sessions(session_key);

-- 15. parent_access_tokens (매직 링크)
CREATE TABLE IF NOT EXISTS parent_access_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '10 days',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pat_token   ON parent_access_tokens(token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pat_student ON parent_access_tokens(student_id);

-- 16. token_sessions (학부모 인증 세션)
CREATE TABLE IF NOT EXISTS token_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id    UUID        NOT NULL REFERENCES parent_access_tokens(id) ON DELETE CASCADE,
  session_key TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_token_sessions_key ON token_sessions(session_key);

-- ============================================================
-- RLS 설정 (모든 테이블 Service Role만 접근)
-- ============================================================
DO $$ DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['users','classes','curriculum_units','weekly_schedule',
    'sentences','unit_sentences','unit_vocab','practice_sessions','recordings',
    'phoneme_errors','daily_stats','weekly_reports','notices',
    'teacher_sessions','parent_access_tokens','token_sessions'])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS service_all ON %I', tbl);
    EXECUTE format('CREATE POLICY service_all ON %I FOR ALL USING (auth.role() = ''service_role'')', tbl);
  END LOOP;
END $$;

-- ============================================================
-- 샘플 데이터 (초기 클래스 생성)
-- ============================================================
INSERT INTO classes (name, level_code, program) VALUES
  ('5-1 Violet', 'VP1', 'kindergarten'),
  ('EP1 · Monday', 'EP1', 'after_school'),
  ('EP2 · Tuesday', 'EP2', 'after_school'),
  ('EP3 · Class', 'EP3', 'after_school')
ON CONFLICT DO NOTHING;
