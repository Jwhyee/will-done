# Project State Map: will-done

이 문서는 "will-done" 프로젝트의 현재 구현 상태를 정의하는 지도입니다. 모든 개발 스프린트는 이 구조를 기반으로 하며, 변경 사항 발생 시 이 문서도 업데이트되어야 합니다.

---

## 1. Directory Architecture

### 📂 Frontend (`src/`)
- `App.tsx`: 애플리케이션의 루트 컴포넌트이자 뷰 전환(Switching) 엔진. 전역 드래그 앤 드롭(Dnd-kit) 컨텍스트 및 모달 관리.
- `main.tsx`: React 엔트리 포인트 및 전역 스타일 로드.
- `components/`: 재사용 가능한 UI 및 레이아웃 컴포넌트.
  - `layout/`: `MainLayout`, `PrimarySidebar` (워크스페이스), `SecondarySidebar` (인박스/달력).
  - `ui/`: shadcn/ui 기반 원자적 컴포넌트 (버튼, 다이얼로그, 툴팁 등).
- `features/`: 도메인별 핵심 비즈니스 뷰 및 컴포넌트.
  - `onboarding/`: 사용자 초기 설정 (`OnboardingView`) 및 워크스페이스 생성 뷰 (`WorkspaceSetupView`).
  - `workspace/`: 메인 타임라인 (`WorkspaceView`) 및 태스크 관리 컴포넌트 (`SortableItem`, `InboxItem`).
  - `retrospective/`: 과거 수행 내역 조회 및 AI 회고 생성 뷰 (`RetrospectiveView`).
  - `settings/`: 프로필 및 워크스페이스 수정 화면 (`SettingsView`).
- `providers/`: 전역 상태 관리를 위한 Context Providers (`AppProvider`, `ToastProvider`).
- `lib/`: 유틸리티 (`utils.ts`) 및 다국어 처리 (`i18n.ts`).
- `types/`: TypeScript 인터페이스 정의 (`index.ts`).

### 📂 Backend (`src-tauri/`)
- `src/lib.rs`: 모든 Tauri Command, 데이터 엔티티(Struct), SQLite 비즈니스 로직 및 AI 프롬프트 엔진 포함.
- `src/main.rs`: Tauri 앱 초기화, DB 마이그레이션(Lang/Urgent 컬럼 추가 등) 및 커맨드 핸들러 등록.
- `Cargo.toml`: Rust 의존성 관리 (`sqlx`, `tokio`, `serde`, `reqwest` 등).

---

## 2. UI Layout Hierarchy

애플리케이션은 `AppContent` 내의 `view` 상태에 따라 전체 화면을 전환합니다.

- **Root**: `App` (`AppProvider` -> `DndContext`)
  - **Loading**: 초기 `get_user` 및 `get_workspaces` 호출 중 노출.
  - **Onboarding**: 유저 정보가 없을 때 강제 진입. 닉네임/언어 설정 모달.
  - **WorkspaceSetup**: 워크스페이스가 없을 때 진입. 워크스페이스 이름, 집중 시간, 역할 설정.
  - **Main View** (`MainLayout` 기반):
    - `PrimarySidebar` (L1): 워크스페이스 아이콘 리스트 및 추가 버튼.
    - `SecondarySidebar` (L2): `Calendar` (데이터 있는 날짜 표시), `Inbox` (미배정 태스크), `Settings` 버튼.
    - `WorkspaceView` (Content):
      - `Header`: 실시간 시계, 지능형 인사말, 태스크 입력 폼(Hours/Mins/Urgent/Memo).
      - `Timeline`: `SortableContext` 내부의 `SortableItem` 리스트. 드래그 가능.
      - `Modals`: 업무 종료 분기 처리(`TransitionModal`), 삭제 확인, 인박스 전체 이동 확인.
  - **Retrospective View**: 회고 생성(`create`) 및 조회(`browse`) 탭 전환 방식.
  - **Settings View**: 사이드바 기반 탭 전환 (프로필 / 워크스페이스).

---

## 3. Implemented Features & API

### 👤 User & Settings
- `get_user` / `save_user`: 유저 프로필(닉네임, API Key, 언어) 관리.
- `get_greeting`: 현재 시간(새벽/아침/점심 등)과 업무 집중 여부에 따른 동적 메시지.

### 🏢 Workspace & Archive
- `create_workspace` / `update_workspace`: 워크스페이스 설정 및 Unplugged Time(배정 제외 시간) 관리.
- `get_active_dates`: `time_blocks` 테이블에서 데이터가 있는 유니크한 날짜 문자열(`YYYY-MM-DD`) 조회.

### ⏳ Timeline Engine (Scheduling)
- `add_task`: 태스크 생성 및 자동 스케줄링.
  - `schedule_task_blocks`: Unplugged Time 회피 및 블록 분할 로직.
  - `shift_future_blocks`: 업무 시간 변동 시 이후 모든 `WILL` 블록 밀기.
- `reorder_blocks`: Dnd-kit의 `arrayMove` 결과를 DB에 반영하고 시간 재계산.
- `process_task_transition`: 업무 종료 시나리오 처리 (`COMPLETE_NOW`, `DELAY` 등).
- `move_to_inbox` / `move_to_timeline`: 타임라인과 인박스 간의 데이터 상태 전환.

### ✨ AI Retrospective (Gemini 1.5 Flash)
- `generate_retrospective`: `DONE` 상태의 블록들을 수집하여 AI 브래그 도큐먼트 생성.
- `get_saved_retrospectives` / `get_latest_saved_retrospective`: 과거 생성 내역 조회.

---

## 4. User Action Flow (Detailed)

### A. 최초 진입 및 온보딩 (Onboarding Flow)
- **[Trigger]**: 앱 실행 시 `get_user` 결과가 `null`인 경우.
- **[Frontend State]**: `view` 상태가 `"onboarding"`으로 변경. `OnboardingView` 내 `Dialog` 오픈.
- **[Backend Command]**: 유저가 닉네임/언어 입력 후 제출 시 `save_user` 호출. SQLite `users` 테이블에 `id=1`로 저장.
- **[UI Feedback]**: 성공 시 `onComplete` 콜백 실행 -> `view`가 `"workspace_setup"`으로 변경되며 워크스페이스 생성 화면으로 전환.

### B. 워크스페이스 생성 및 설정 (Workspace Setup Flow)
- **[Trigger]**: 온보딩 완료 직후 또는 `PrimarySidebar` 하단 `+` 버튼 클릭.
- **[Frontend State]**: `view` 상태가 `"workspace_setup"`으로 변경. `useFieldArray`를 통해 언플러그드 타임 동적 추가 가능 상태.
- **[Backend Command]**: `create_workspace` 호출. `workspaces` 테이블과 `unplugged_times` 테이블에 트랜잭션으로 저장.
- **[UI Feedback]**: 성공 시 신규 생성된 `workspaceId` 반환 -> `view`가 `"main"`으로 변경되고 해당 워크스페이스가 활성화됨.

### C. 프로필/설정 변경 (Settings Flow)
- **[Trigger]**: `SecondarySidebar` 하단 톱니바퀴 아이콘 클릭.
- **[Frontend State]**: `view` 상태가 `"settings"`로 변경. `profile` / `workspace` 탭 전환 상태 관리.
- **[Backend Command]**: `save_user`(프로필) 또는 `update_workspace`(워크스페이스) 호출.
- **[UI Feedback]**: 성공 시 `ToastProvider`를 통해 `"프로필이 업데이트되었습니다."` 또는 `"워크스페이스가 업데이트되었습니다."` 메시지 노출. `onUserUpdate` 콜백을 통해 전역 유저 상태 갱신.

### D. 쾌속 업무 입력 (Task Entry Flow)
- **[Trigger]**: `WorkspaceView` 상단 폼에서 제목, 시간 입력 후 `Enter` 또는 `추가` 버튼 클릭.
- **[Frontend State]**: `taskForm.handleSubmit` 실행. 입력 데이터 검증(Zod).
- **[Backend Command]**: `add_task` 호출. 마지막 태스크 종료 시점부터 자동 배정. 언플러그드 타임 중복 시 블록 쪼개기 수행.
- **[UI Feedback]**: `fetchMainData`를 통해 타임라인 리렌더링. 입력 폼 초기화.

### E. 🔥 긴급 업무 입력 및 타임 시프트 (Urgent Task Flow)
- **[Trigger]**: 태스크 입력 시 `🔥 Urgent` 체크박스 활성화 후 추가.
- **[Frontend State]**: `is_urgent: true` 상태로 백엔드 전송.
- **[Backend Command]**: `add_task` 내 긴급 로직 실행.
  1. 현재 진행 중인(`NOW`) 블록을 `PENDING` 상태로 변경하고 종료 시간을 '현재'로 자름.
  2. 긴급 업무를 즉시(`now`) 시작하도록 삽입.
  3. `shift_future_blocks`를 호출하여 중단된 업무의 남은 분량과 이후 모든 일정을 긴급 업무 시간만큼 뒤로 밀기.
- **[UI Feedback]**: 타임라인에 붉은색 `🔥 Urgent` 표시와 함께 끊어진 업무(Pending)와 뒤로 밀린 일정들이 즉시 리렌더링됨.

### F. 업무 종료 및 분기 처리 (Task Transition Flow)
- **[Trigger]**: 타임라인 내 `NOW` 상태 블록의 `Pencil` 아이콘 클릭 또는 종료 시간 도래 시 자동 팝업.
- **[Frontend State]**: `transitionBlock` 상태에 해당 블록 정보 저장 -> `Transition Modal` 오픈.
- **[Backend Command]**: `process_task_transition` 호출.
  - `COMPLETE_NOW`: 실제 완료 시점으로 시간을 고정하고 이후 일정 당김/밀기.
  - `DELAY`: 지정된 분만큼 현재 블록 연장 및 이후 일정 밀기.
- **[UI Feedback]**: 모달 닫힘. 타임라인 리렌더링. 상태가 `DONE`으로 변경되며 리뷰 메모 저장 완료.

### G. AI 회고 생성 (AI Retrospective Flow)
- **[Trigger]**: `RetrospectiveView` 내에서 타입(일간/주간/월간) 및 날짜 선택 후 `회고 생성하기` 클릭.
- **[Frontend State]**: `isGenerating` 상태 `true` 변경 (로딩 스피너 및 안내 문구 노출).
- **[Backend Command]**: `generate_retrospective` 호출. 
  1. DB에서 해당 기간의 모든 `DONE` 블록과 `planning_memo`, `review_memo` 수집.
  2. Gemini API 호출하여 마크다운 텍스트 수신.
  3. `retrospectives` 테이블에 결과 저장.
- **[UI Feedback]**: 생성 완료 후 데스크탑 알림(`tauri-plugin-notification`) 발송. 마크다운 결과가 담긴 `Dialog` 모달 오픈. `ReactMarkdown`을 통해 렌더링.

