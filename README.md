# 🚀 will-done (윌-던)

<div align="right">
  <strong>한국어</strong> | <a href="./README_en.md">English</a>
</div>

**"흩어진 내 업무 시간을 커리어로 연결하는 타임 트래커"**

이직을 준비하려는데 그동안 내가 무슨 일을 하며 성과를 냈는지 기억나지 않으시나요?
열심히 일하던 중 갑작스러운 요청 때문에 오늘 계획했던 일을 놓쳐본 적이 있나요?

`will-done`은 단순히 할 일(TODO)을 나열하는 앱이 아닙니다.
나의 업무 시간(will)을 체계적으로 설계하고, 완료된 기록(done)을 당신의 다음 연봉 협상을 위한 강력한 무기(Brag Document)로 만들어주는 데스크톱 생산성 도구입니다.

---

## 💡 이런 분들께 추천합니다!

* [x] "내가 오늘 하루 종일 뭐 했지?"라며 퇴근길에 허무함을 느끼시는 분
* [x] 이직 준비를 위해 경력기술서를 써야 하는데 기억이 가물가물하신 주니어 개발자
* [x] 하나에 집중하다 보면 시간 가는 줄 모르고 다른 업무를 놓치시는 분
* [x] 내 업무 데이터를 외부 서버가 아닌 내 컴퓨터에 안전하게 보관하고 싶으신 분

**will-done**과 함께라면 당신의 모든 시간은 경력이 됩니다.

---

## ✨ Core Features (핵심 기능)

### 1. 지능형 타임 시프트 및 스케줄링 (Time-Shift Engine)
* **긴급 업무 대응**: 화급 업무(Urgent Task) 발생 시 현재 진행 중인 태스크를 중단(PENDING) 및 분할합니다. 삽입된 긴급 업무의 소요 시간만큼 이후의 모든 예정된(WILL) 일정들을 수학적으로 계산하여 뒤로 미룹니다(Shift).
* **언플러그드 타임 회피**: 점심시간, 정기 회의 등 고정된 시간을 설정하면 스케줄러가 해당 시간을 피해 태스크 블록을 자동으로 분할하고 배정합니다.

### 2. AI 기반 다중 주기 회고 및 성과 문서화 (AI Retrospective)
* **Brag Document 자동화**: 완료된 태스크의 '계획 메모'와 '리뷰 메모'를 취합하여, 사용자가 설정한 역할(Role Intro)에 맞는 전문적인 마크다운 성과 보고서를 생성합니다.
* **다중 모델 폴백(Fallback) 엔진**: Gemini API의 Quota Exceeded(429) 또는 서버 에러 발생 시, `로컬 캐시 모델 -> flash-lite -> flash -> pro` 순으로 자동 전환하며 재시도하여 회고 생성의 안정성을 극대화했습니다.

### 3. 컨텍스트 분리 및 로컬 퍼스트 (Context & Privacy)
* **워크스페이스 기반 격리**: 코어 타임(Core Time)과 AI 프롬프트 컨텍스트를 워크스페이스 단위로 완벽히 분리하여 사이드 프로젝트와 본업을 섞임 없이 관리합니다.
* **완벽한 데이터 주권**: 모든 데이터는 외부 서버가 아닌 사용자 로컬 환경의 SQLite에 저장되어 극대화된 보안과 프라이버시를 제공합니다.

---

## 🛠️ Tech Stack

최상의 데스크톱 퍼포먼스와 네이티브 수준의 UI/UX를 위해 다음과 같은 모던 스택으로 구축되었습니다.

### Frontend
* **Core**: React 18, TypeScript, Vite
* **Styling/UI**: Tailwind CSS, shadcn/ui, Framer Motion
* **State/Interaction**: `dnd-kit`, `react-hook-form` + `zod`

### Backend (Core Engine)
* **Framework**: Tauri v2
* **Language**: Rust
* **Database**: SQLite (`sqlx`, 비동기 커넥션 풀 및 트랜잭션 관리)
* **Concurrency**: `tokio`

---

## 🚀 Getting Started (설치 및 실행)

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 이상 권장)
* [Rust](https://www.rust-lang.org/tools/install)
* OS별 Tauri 시스템 종속성 (macOS: Xcode Command Line Tools, Windows: C++ Build Tools)

### Installation

1. 저장소를 클론합니다.
```bash
git clone [https://github.com/USERNAME/will-done.git](https://github.com/USERNAME/will-done.git)
cd will-done

```

2. 패키지를 설치합니다.

```bash
npm install

```

3. 개발 모드로 앱을 실행합니다.

```bash
npm run tauri dev

```

---

## 🏗️ System Architecture

프론트엔드(UI 렌더링 및 상태 관리)와 백엔드(DB I/O 및 스케줄링 연산)의 역할을 명확히 분리하여 복잡도를 통제합니다.

```text
will-done/
├── src/                      # Frontend (React/TS)
│   ├── components/           # 재사용 가능한 UI 및 레이아웃
│   ├── features/             # 도메인별 비즈니스 로직 캡슐화
│   │   ├── workspace/        # 타임라인, 태스크 블록, DND 뷰
│   │   ├── retrospective/    # AI 회고 생성 폼 및 브라우저
│   │   └── onboarding/       # 초기 설정 플로우
│   ├── lib/                  # 다국어(i18n) 및 유틸리티
│   └── types/                # 통합 TypeScript 인터페이스
└── src-tauri/                # Backend (Rust)
    ├── src/
    │   ├── commands/         # Tauri IPC 커맨드 계층
    │   ├── database/         # DAL (Data Access Layer), SQL 로직
    │   ├── models.rs         # 데이터 엔티티 및 DTO
    │   └── error.rs          # 통합 에러 핸들링
    └── Cargo.toml

```

## 🧠 Core Domain Lifecycle

1. **Inbox -> Timeline**: 아이디어나 할 일을 Inbox에 임시 저장한 후, 타임라인으로 드래그 앤 드롭하여 스케줄링(WILL)합니다.
2. **Transition (NOW)**: 스케줄러에 의해 태스크가 시작되면 상태가 `NOW`로 변경되며, 마감 시간이 지나면 UI에 붉은색 글로우(Breathing effect)로 경고를 보냅니다.
3. **Completion (DONE)**: 태스크 종료 시 실제 수행 시간과 회고 메모를 작성하여 `DONE` 처리합니다. (분할된 동일 태스크의 과거 블록들도 함께 동기화됩니다.)
4. **Archive (AI)**: 누적된 `DONE` 데이터들은 주말이나 월말에 버튼 한 번으로 훌륭한 '성과 요약서(Retrospective)'로 컴파일됩니다.