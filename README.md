# 📱 카페 주문번호 디스플레이 시스템

Firebase Realtime Database를 사용한 실시간 주문번호 디스플레이 시스템입니다.

## 🌟 주요 기능

- **실시간 주문번호 표시**: Firebase를 통한 실시간 동기화
- **사운드 알림**: 새 주문번호 등장 시 알림음 재생
- **자동 만료**: 5분 후 주문번호 자동 제거
- **모바일 최적화**: 터치 기기에서 숫자 키패드 자동 활성화
- **중복 방지**: 같은 주문번호 중복 입력 방지

## 📋 페이지 구성

- **메인 페이지** (`/`): Room ID 설정 및 테스트 기능
- **Controller** (`/controller?room=ID`): 직원용 주문번호 입력 페이지
- **Display** (`/display?room=ID`): 고객용 주문번호 디스플레이 페이지

## 🚀 Getting Started

### 환경 설정

먼저 `.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# 기본 Room ID (선택사항, 기본값: AB12)
NEXT_PUBLIC_DEFAULT_ROOM_ID=AB12

# 사운드 파일 경로 (선택사항, 기본값: /Ding-Dong-hd.mp3)
NEXT_PUBLIC_SOUND_URL=/Ding-Dong-hd.mp3
```

### 개발 서버 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 열어 확인하세요.

## 📖 사용 방법

### 1. Room ID 설정

- 메인 페이지에서 원하는 Room ID를 입력하세요 (예: AB12, CAFE01 등)
- Display와 Controller는 같은 Room ID를 사용해야 연결됩니다

### 2. Display 설정 (고객용 화면)

- Display 페이지를 대형 모니터나 태블릿에서 전체화면으로 실행
- 🔊 버튼을 클릭하여 사운드를 활성화
- 새 주문번호가 나타나면 3초간 하이라이트 + 딩동 소리

### 3. Controller 사용 (직원용)

- 주문이 완료되면 Controller 페이지에서 주문번호 입력
- 숫자 키패드 또는 직접 입력 가능
- 실수로 입력한 경우 Undo 버튼으로 복구 가능

## 🛠 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, ShadCN UI, Framer Motion
- **Form**: React Hook Form + Zod
- **Database**: Firebase Realtime Database
- **Sound**: Web Audio API + Custom Hook
- **Deployment**: Vercel

## 📁 프로젝트 구조

```
├── app/
│   ├── controller/page.tsx    # 직원용 컨트롤러
│   ├── display/page.tsx       # 고객용 디스플레이
│   └── page.tsx              # 메인 페이지
├── components/
│   ├── ui/                   # ShadCN UI 컴포넌트
│   └── OrderCard.tsx         # 주문번호 카드
├── hooks/
│   └── useSound.ts           # 사운드 재생 훅
├── utils/
│   └── firebaseClient.ts     # Firebase 설정
└── public/
    └── Ding-Dong-hd.mp3      # 알림음 파일
```

## 🔧 커스터마이징

### 사운드 파일 변경

1. `public/` 폴더에 새로운 사운드 파일 추가
2. `.env.local`에서 `NEXT_PUBLIC_SOUND_URL` 수정

### 기본 Room ID 변경

- `.env.local`에서 `NEXT_PUBLIC_DEFAULT_ROOM_ID` 수정

### 만료 시간 변경

- `app/controller/page.tsx`와 `app/display/page.tsx`에서 `5 * 60 * 1000` (5분) 수정

## 🚀 배포

Vercel에 배포하는 것을 권장합니다:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)

환경 변수를 Vercel 대시보드에서 설정하는 것을 잊지 마세요!
