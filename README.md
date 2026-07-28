# JESUS TALK — 실시간 참여형 웹앱

**OH MY JESUS** 청소년 수련회 프로그램 `JESUS TALK`을 위한 웹앱입니다.
참가자 설문 → 진행자 승인 → 행사장 LED 송출까지 전부 이 앱 안에서 이루어집니다.
Google Form / Sheets / Apps Script는 사용하지 않습니다.

| 경로 | 용도 | 사용 기기 |
|---|---|---|
| `/participate` | 참가자 설문 | 참가자 휴대전화 |
| `/admin` | 응답 검토·승인·송출 | 진행자 노트북 |
| `/screen` | LED 송출 화면 (2000×1120) | LED 연결 PC, 전체화면 |

---

## 1. 폴더 구조

```
jesus-talk/
├─ index.html                  # 웹폰트(Pretendard, Playfair Display Italic) 연결
├─ package.json / vite.config.js
├─ vercel.json                 # Vercel SPA 리라이트
├─ .github/workflows/deploy.yml # ★ GitHub Pages 자동 배포
├─ .env.example                # 환경변수 예시
├─ public/
│  └─ _redirects               # Netlify SPA 리라이트
├─ supabase/
│  ├─ 01_schema.sql            # 테이블 · 인덱스 · Realtime
│  ├─ 02_policies.sql          # RLS 보안 정책
│  └─ 03_screen_read.sql       # /screen 전용 최소권한 뷰
└─ src/
   ├─ main.jsx / AppRouter.jsx
   ├─ styles/
   │  ├─ variables.css         # ★ 디자인 변수 (여기만 고치면 전체가 바뀜)
   │  └─ global.css
   ├─ lib/
   │  ├─ supabaseClient.js     # anon key만 사용 · 미설정 시 샘플 모드
   │  ├─ responseService.js    # 응답 저장/조회/문항별 상태 갱신
   │  ├─ broadcastService.js   # 방송 상태 (LED가 지금 무엇을 보여주는가)
   │  ├─ screenService.js      # /screen 전용 안전 조회
   │  ├─ settingsService.js    # 행사명·접수 마감·QR 표시 등
   │  ├─ realtimeService.js    # 연결 상태 감지
   │  ├─ authService.js        # 관리자 로그인
   │  ├─ localDraft.js         # 임시저장 · 제출 간격 제한
   │  ├─ sanitize.js           # 입력 검증 · HTML 무해화
   │  ├─ answerDisplay.js      # 자동 글자 크기 · 페이지 분할 (AnswerPaginator)
   │  ├─ questions.js          # 문항 정의 (문구 수정은 여기서)
   │  ├─ urls.js               # 참여 주소 생성 (QR이 사용)
   │  └─ sampleData.js         # 로컬 샘플 응답
   └─ components/
      ├─ common/   BrandLogo · CRTOverlay · ConnectionStatus · LoadingScreen · ErrorBoundary
      ├─ participate/ ParticipatePage · Welcome/Nickname/Question/Q3/Review/Success Step
      │              · ProgressBar · CharacterCounter · PrivacyNotice
      ├─ admin/    AdminPage · AdminLogin · AdminDashboard · AdminToolbar
      │            · ResponseCard · BroadcastControls(+Preview) · QRCodePanel · AdminSettings
      └─ screen/   ScreenPage · CityBackdrop · IdleScreen · QuestionIntroScreen
                   · ResponseScreen · BreakScreen(+Ending/Blackout)
```

---

## 2. 바로 실행하기 (Supabase 없이)

```bash
npm install
npm run dev
```

`.env`가 없으면 **로컬 샘플 데이터 모드**로 자동 실행됩니다.
샘플 응답 4건(짧은/중간/긴 답변 포함)으로 자동 글자 크기와 페이지 분할을 미리 확인할 수 있습니다.
`/admin` 로그인은 아무 이메일이나 입력하면 통과합니다.

> 샘플 모드는 브라우저 메모리에서만 동작하므로, `/admin`과 `/screen`을 **같은 탭에서 오가며** 확인하세요.
> 두 창을 동시에 띄워 실시간 연동을 보려면 아래 Supabase 설정이 필요합니다.

---

## 3. Supabase 설정

### 3-1. 프로젝트 생성 & SQL 실행
1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. **SQL Editor**에서 순서대로 실행
   - `supabase/01_schema.sql`
   - `supabase/02_policies.sql`
   - `supabase/03_screen_read.sql`
3. `01_schema.sql` 안의 `admin@yourchurch.org`를 **실제 진행자 이메일**로 바꾸세요.
   여러 명이면 `insert` 줄을 늘리면 됩니다.

### 3-2. Realtime 활성화
`01_schema.sql`이 `supabase_realtime` publication에 세 테이블을 추가합니다.
확인: **Database → Replication → supabase_realtime**에 `responses`, `broadcast_state`, `event_settings`가 있으면 완료.

### 3-3. 관리자 계정 만들기
**Authentication → Users → Add user**에서 `01_schema.sql`에 넣은 이메일로 계정을 생성합니다.
(초대 메일 대신 "Auto Confirm User"를 켜고 비밀번호를 직접 지정하는 편이 행사 준비에 편합니다.)

### 3-4. 환경변수
`.env.example`을 `.env`로 복사하고 **Project Settings → API**의 값을 넣습니다.

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> ⚠️ `service_role` key는 절대 프론트엔드에 넣지 마세요. 이 앱은 `anon` key만 사용합니다.

---

## 4. 보안 구조 요약

| 역할 | responses | broadcast_state |
|---|---|---|
| 참가자(anon) | **INSERT만** 가능. 다른 사람 응답 조회 불가 | 읽기만 가능 |
| 관리자(로그인) | 전체 조회 · 수정 | 수정 가능 |
| LED 화면 | `now_on_air` 뷰로 **승인된 문항만** 읽음 | 읽기 |

- 참가자에게는 SELECT 정책이 아예 없어 남의 응답을 볼 수 없습니다.
- `now_on_air` 뷰는 `question_statuses`가 `approved`가 아닌 문항을 `null`로 반환합니다.
  **승인하지 않은 답변은 구조적으로 LED에 표시될 수 없습니다.**
- 접수 마감 시 INSERT 정책이 막히므로 프론트를 우회해도 제출되지 않습니다.

---

## 5. 배포 (GitHub Pages)

이 프로젝트는 **GitHub Pages 자동 배포**로 설정되어 있습니다.
파일을 GitHub에 올리기만 하면 나머지는 자동입니다.

### 5-1. 저장소 만들고 파일 올리기
1. [github.com](https://github.com) → **New repository**
   - 이름은 `jesus-talk` 권장 (다른 이름이면 5-2로)
   - **Public**으로 만드세요 (무료 Pages는 공개 저장소만 지원)
2. **uploading an existing file** 클릭 → 압축 푼 폴더 **안의 내용물**을 드래그
   - `node_modules` 폴더가 있다면 제외하세요

> ⚠️ **가장 흔한 실수**: `.github` 폴더는 숨김 폴더라 드래그해도 안 올라갑니다.
> 이 폴더가 없으면 배포가 아예 시작되지 않아요. 아래 5-3을 꼭 확인하세요.

### 5-2. 저장소 이름이 `jesus-talk`가 아니라면
`vite.config.js` 맨 위의 값을 실제 저장소 이름으로 바꿔주세요.
```js
const BASE_PATH = '/실제저장소이름/'
```
이걸 안 맞추면 화면이 하얗게만 뜹니다.

### 5-3. 배포 설정 파일 확인 (필수)
저장소에 `.github/workflows/deploy.yml`이 보이는지 확인하세요. **없다면** 직접 만듭니다.

1. 저장소에서 **Add file → Create new file**
2. 파일명 칸에 `.github/workflows/deploy.yml`을 그대로 입력
   (슬래시를 치면 폴더가 자동으로 만들어집니다)
3. 압축 파일 안의 같은 경로 파일 내용을 복사해 붙여넣고 **Commit**

### 5-4. Pages 켜기
**Settings → Pages → Source**를 `Deploy from a branch`가 아닌 **`GitHub Actions`**로 변경합니다.

### 5-5. 환경변수 등록
**Settings → Secrets and variables → Actions → New repository secret**에서 두 개를 각각 등록합니다.

| Name | Secret |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |

> anon key는 원래 브라우저에 노출되는 값이라 공개돼도 안전합니다. RLS가 접근을 막아줍니다.

### 5-6. 배포 확인
**Actions** 탭에서 초록색 체크가 뜨면 완료입니다 (1~2분 소요).
Settings → Pages 상단에 주소가 표시됩니다.

| 화면 | 주소 |
|---|---|
| 참가자 | `https://아이디.github.io/jesus-talk/#/participate` |
| 관리자 | `https://아이디.github.io/jesus-talk/#/admin` |
| LED 송출 | `https://아이디.github.io/jesus-talk/#/screen` |

주소에 `#`이 들어가는 건 정상입니다. GitHub Pages가 하위 경로를 서버에서 못 찾기 때문에 `HashRouter`를 사용합니다. QR 코드는 `#`이 있어도 정상 작동합니다.

### 5-7. 마무리 (빼먹으면 로그인 실패)
Supabase → **Authentication → URL Configuration → Site URL**에 배포 주소를 넣으세요.
```
https://아이디.github.io/jesus-talk/
```

### 수정 사항 반영
파일을 수정해 GitHub에 다시 올리면 1~2분 뒤 자동으로 반영됩니다.
급하면 **Actions 탭 → Deploy to GitHub Pages → Run workflow**로 수동 실행할 수 있습니다.

---

## 5-B. Vercel / Netlify로 배포하려면

GitHub Pages 대신 쓰실 경우 주소에서 `#`을 없앨 수 있습니다.

1. `vite.config.js`의 `BASE_PATH`를 `'/'`로 변경
2. `src/AppRouter.jsx`에서 `HashRouter` → `BrowserRouter` (import 포함 3군데)
3. Vercel: GitHub 계정으로 로그인 → Add New Project → 저장소 선택 → Environment Variables에 위 두 개 입력 → Deploy
   Netlify: Build command `npm run build`, Publish directory `dist`

`vercel.json`과 `public/_redirects`가 이미 포함되어 있어 새로고침 시 404가 나지 않습니다.

---

## 6. 행사 당일 운영

### 준비 (행사 1시간 전)
1. 노트북에서 `/admin` 로그인 → 우측 **참여 QR** 패널에서 PNG 저장 → 안내 슬라이드/포스터에 삽입
2. LED PC 브라우저에서 `/screen` 열고 **F키**로 전체화면 → 마우스 커서는 자동으로 숨겨집니다
3. 설정 탭에서 **참여 주소** 확인, **설문 접수 열기** 체크 확인
4. `/admin`에서 기본 화면(**I**)으로 두고, 대기 중에는 **QR 표시하기**를 켜두면 LED에 참여 QR이 뜹니다

### 진행 흐름
```
대기 화면(QR) → Q1 인트로(1키 두 번) → 답변 승인 → 즉시 송출(Enter)
→ 다음 답변(→) → Q2 인트로(2키) → … → 잠시 기다려주세요(H) → 엔딩(E)
```

1. 응답이 들어오면 헤더의 **신규 n건**이 올라갑니다 (새로고침 불필요)
2. 문항 탭에서 답변을 읽고 **승인** → **즉시 송출**
3. 송출 직후 2초간 **되돌리기** 토스트가 뜹니다. 실수하면 바로 취소하세요
4. 긴 답변은 자동으로 2페이지로 나뉩니다. **→/←**로 페이지를 넘기고 LED 우하단에 `1/2`가 표시됩니다
5. 줄바꿈을 다듬고 싶으면 카드의 **표시 편집**을 누르세요. **참가자 원문은 바뀌지 않고** 송출용 텍스트만 조정됩니다

### 키보드 단축키 (입력창에 커서가 없을 때만 동작)
| 키 | 동작 |
|---|---|
| `←` `→` | 이전/다음 답변 (2페이지 답변이면 페이지 이동 우선) |
| `Enter` | 선택한 답변 송출 |
| `Space` | 기본 화면 ↔ 현재 답변 전환 |
| `1`~`4` | 해당 문항 탭 이동 (같은 탭에서 다시 누르면 인트로 송출) |
| `I` / `H` / `E` / `B` | 기본 / 잠시 기다려주세요 / 엔딩 / 검은 화면 |
| `F` | `/screen` 창 전체화면 |

### 행사 후
설정 탭에서 **설문 접수 열기**를 끄면 참여 화면에 마감 안내가 표시됩니다.
기존 응답과 방송 기능은 그대로 유지됩니다.

---

## 7. 두 화면 / 두 컴퓨터로 쓰기

**권장: 노트북 1대 + LED 출력**
1. 노트북에 LED를 **확장 디스플레이**로 연결
2. 브라우저 창 A에 `/admin` → 노트북 화면
3. 브라우저 창 B에 `/screen` → LED 화면으로 드래그 후 `F` 전체화면
4. 같은 브라우저이므로 관리자 세션이 공유되어 추가 로그인이 필요 없습니다

**컴퓨터 2대로 나눠 쓸 때**
- LED PC에서도 `/admin`으로 한 번 로그인한 뒤 `/screen`을 열면 가장 안전합니다
- 로그인 없이 `/screen`만 띄워도 `now_on_air` 뷰를 통해 승인된 답변은 정상 표시됩니다
- 두 대 모두 같은 배포 주소를 사용해야 합니다

---

## 8. 네트워크 오류 대처

| 상황 | 앱 동작 | 대처 |
|---|---|---|
| 잠깐 끊김 | LED는 **마지막 화면을 그대로 유지**, 관리자 헤더에 `연결 끊김` 표시 | 그대로 진행, 자동 재연결 |
| 재연결됨 | 최신 방송 상태를 다시 불러옴 | 별도 조작 불필요 |
| 오래 끊김 | 새 응답이 안 들어옴 | 관리자 화면 새로고침. **LED 창은 건드리지 마세요** |
| LED 창이 꺼짐 | — | `/screen` 다시 열고 `F`. 방송 상태는 DB에 있으므로 즉시 복구됩니다 |
| 참가자 제출 실패 | 화면에 오류 안내, 작성 내용은 localStorage에 유지 | 다시 제출하면 됩니다 |

행사장 Wi-Fi가 불안하면 **진행자 노트북만 유선/테더링**으로 두세요. 참가자 휴대폰은 각자 데이터로 접속합니다.

---

## 9. 디자인 변수 목록 (`src/styles/variables.css`)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `--canvas-width` / `--canvas-height` | `2000px` / `1120px` | LED 디자인 기준 |
| `--safe-x` / `--safe-y` | `100px` / `70px` | 안전 영역 |
| `--color-bg` | `#061b28` | 짙은 네이비 |
| `--color-bg-deep` | `#02090f` | 가장 어두운 배경 |
| `--color-neon` | `#48ff38` | 네온 그린 |
| `--color-neon-soft` | `rgba(72,255,56,.35)` | 네온 번짐 |
| `--color-text` / `--color-muted` | `#ecf2ed` / `#8ba19b` | 본문 / 보조 텍스트 |
| `--font-logo` | Playfair Display Italic | 로고용 세리프 이탤릭 |
| `--font-body` | Pretendard | 한글 본문 |
| `--answer-font-short/medium/long` | 108 / 88 / 70px 상한 | 답변 자동 크기 3단계 |
| `--nickname-font` / `--label-font` | 36px / 32px 상한 | 닉네임 · 문항 라벨 |
| `--transition-duration` | `600ms` | 화면 전환 페이드 |
| `--scanline-opacity` | `0.10` | CRT 가로줄 |
| `--noise-opacity` | `0.08` | VHS 노이즈 |
| `--vignette-opacity` | `0.45` | 가장자리 어둡기 |

글자 크기 단계 기준(몇 자부터 작아지는지)은 `src/lib/answerDisplay.js`의 `SHORT_LIMIT`, `MEDIUM_LIMIT`, `PAGE_CHAR_LIMIT`에서 조정합니다.

---

## 10. 이미지 · 로고 교체

- **배경**: 도시 스카이라인은 `src/components/screen/CityBackdrop.jsx`에서 SVG로 그립니다.
  사진을 쓰려면 `public/city.jpg`를 넣고 `screen.css`의 `.screen-canvas` 배경에 추가하세요.
  ```css
  background: url('/city.jpg') center bottom / cover no-repeat,
              radial-gradient(ellipse at 50% 20%, #0c3145 0%, var(--color-bg) 45%, var(--color-bg-deep) 100%);
  ```
- **로고**: 텍스트 워드마크(`BrandLogo.jsx`)로 되어 있습니다. 이미지 파일로 바꾸려면
  `public/logo.png`를 넣고 `BrandLogo.jsx`의 `.brand-logo__word` 부분을 `<img>`로 교체하세요.
- **문항 문구**: `src/lib/questions.js` 한 파일에서 모두 수정됩니다.

> 첨부해주신 원본 이미지의 글자는 배경에 넣지 않았습니다.
> 로고 · 질문 · 닉네임 · 답변은 모두 선명한 HTML 텍스트로 렌더링됩니다.

---

## 11. 우선순위 체크리스트

- [x] 참가자가 휴대폰으로 쉽게 제출 (8단계 · 16px 입력 · 48px 버튼 · 자동 임시저장)
- [x] 제출 즉시 관리자 화면에 실시간 반영 (새로고침 불필요)
- [x] **관리자 승인 없이는 LED에 절대 표시되지 않음** (프론트 + RLS + 뷰 3중 차단)
- [x] 선택한 답변 즉시 송출 + 2초 되돌리기
- [x] 2000×1120에서 크고 선명한 글자 (자동 3단계 + 2페이지 분할)
- [x] 단축키 중심의 단순 조작
