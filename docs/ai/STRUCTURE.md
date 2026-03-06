# Project State Map: will-done

이 문서는 "will-done" 프로젝트의 현재 구현 상태를 정의하는 지도입니다. 모든 개발 스프린트는 이 구조를 기반으로 하며, 변경 사항 발생 시 이 문서도 업데이트되어야 합니다.

---

## 1. Directory Architecture

### 📂 Frontend (`src/`)
- `App.tsx`: 애플리케이션의 루트 컴포넌트이자 뷰 전환(Switching) 엔진. 전역 드래그 앤 드롭(Dnd-kit) 컨텍스트 및 모달 관리.
- `main.tsx`: React 엔트리 포인트 및 전역 스타일 로드.
- `components/`: 재사용 가능한 UI 및 레이아웃 컴포넌트.
  - `layout/`: `MainLayout`, `PrimarySidebar` (워크스페이스 및 설정).
  - `ui/`: shadcn/ui 기반 원자적 컴포넌트 (버튼, 다이얼로그, 툴팁, 시트 등).
- `features/`: 도메인별 핵심 비즈니스 뷰 및 컴포넌트.
  - `onboarding/`: 사용자 초기 설정 (`OnboardingView`).
  - `workspace/`: 메인 타임라인 (`WorkspaceView`).
    - `components/`: `WorkspaceCreateModal`, `TimePicker`, `TransitionModal`, `DroppableArea`, `InboxItem`, `SortableItem`, `TaskForm`, `WorkspaceDialogs`, `WorkspaceHeader`, `WorkspaceInbox`, `WorkspaceTimeline`, `RecurringTaskForm`, `RecurringTaskList`, `RoutineSuggestionBar`.
    - `hooks/`: `useWorkspace.ts`, `useRecurringTasks.ts`.
  - `retrospective/`: 과거 수행 내역 조회 및 AI 회고 생성 뷰 (`RetrospectiveView`).
    - `components/`: `DateSelector`, `Stepper`.
    - `utils.ts`: 기간 계산 및 포맷팅 유틸리티.
  - `settings/`: 프로필 및 워크스페이스 수정 화면 (`SettingsView`).
- `providers/`: 전역 상태 관리를 위한 Context Providers (`AppProvider`, `ToastProvider`).
- `hooks/`: 비즈니스 로직 캡슐화를 위한 커스텀 훅 (`useApp`).
- `lib/`: 유틸리티 (`utils.ts`) 및 다국어 처리 (`i18n.ts`).
- `test/`: Vitest 테스트 설정 및 Mock 데이터 (`setup.ts`).
- `types/`: TypeScript 인터페이스 정의 (`index.ts`).

### 📂 Backend (`src-tauri/`)
- `src/lib.rs`: Tauri 앱 라이브러리 엔트리 포인트. 모듈 선언 및 초기화.
- `src/main.rs`: Tauri 앱 실행기. `will_done_lib::run()` 호출.
- `src/error.rs`: `AppError` 및 `Result` 타입을 통한 통합 에러 핸들링.
- `src/models.rs`: 데이터 엔티티(User, Workspace, Task 등) 및 DTO 정의.
- `src/database/`: 데이터 접근 계층 (DAL). SQL 쿼리 및 물리적 DB 조작 로직.
  - `user.rs`, `workspace.rs`, `timeline.rs`, `retrospective.rs`
- `src/commands/`: Tauri 커맨드 계층. 비즈니스 로직 및 서비스 연동.
  - `user.rs`, `workspace.rs`, `timeline.rs`, `retrospective.rs`
- `Cargo.toml`: Rust 의존성 관리 (`sqlx`, `thiserror`, `chrono` 등).

### 📂 Project Infrastructure
- `.github/workflows/release.yml`: GitHub Actions를 통한 멀티 플랫폼(Windows, macOS, Linux) 자동 빌드 및 릴리스 파이프라인.
- `src-tauri/tauri.conf.json`: `plugins.updater` 설정을 통한 자동 업데이트 활성화.

---

## 2. UI Layout Hierarchy

애플리케이션은 `AppContent` 내의 `view` 상태에 따라 전체 화면을 전환하며, **프레임리스 오버레이(Overlay) 타이틀 바** 디자인을 적용하여 모던한 데스크톱 경험을 제공합니다.

- **Window**: `titleBarStyle: Overlay` 적용. 다크 테마 강제 및 창 제어 버튼(신호등) 유지.
- **Root**: `App` (`AppProvider` -> `DndContext`)
  - **Loading**: 초기 `get_user` 및 `get_workspaces` 호출 중 노출. 상단 전용 드래그 레이어(`h-8`) 적용.
  - **Onboarding**: 유저 정보가 없을 때 강제 진입. **[1. 닉네임 / 2. 하루 시작 시간 / 3. API Key / 4. 알림 설정]**의 4단계 대화형 멀티 스텝 구조를 적용. `h-fit` 속성을 통해 콘텐츠의 양에 따라 유동적으로 조절되는 카드 컨테이너를 사용하며, 타이틀(h1)과 서브타이틀(h3)의 위계를 분리하여 시각적 명확성을 높임. 하단에는 화이트 캡슐 및 징크 도트 형태의 커스텀 인디케이터를 통해 진행 상태를 직관적으로 제공함. 배경에 드래그 레이어(`h-8`) 적용. 완료 시 즉시 `Main View`로 진입함.
  - **Main View** (`MainLayout` 기반):
    - `PrimarySidebar` (L1): 워크스페이스 아이콘 리스트 (56px/w-14), 추가 버튼, 그리고 최하단에 전역 설정(톱니바퀴) 버튼 배치. 
      - **Overlay Design**: 상단에 macOS 신호등 공간 충분히 확보(`pt-8`) 및 전용 드래그 레이어(`h-8`) 설정.
      - **Empty State Hint**: 워크스페이스가 하나도 없을 경우, 추가(`+`) 버튼에 `animate-pulse` 효과를 주어 사용자의 액션을 유도함.
    - `WorkspaceView` (Content): `PrimarySidebar` 우측의 모든 공간을 차지하는 메인 작업 영역.
      - **Empty State**: 활성화된 워크스페이스가 없을 경우 중앙에 환영 메시지와 로켓 아이콘, 그리고 `워크스페이스 생성하기` 버튼을 노출하여 초기 진입 장벽을 낮춤.
      - **Header Actions**: 우측 상단에 **인박스(📥)**와 **회고(✨)** 버튼 배치. 
        - **인박스**: 클릭 시 우측에서 `Sheet`(shadcn/ui)가 슬라이드되어 나오며 인박스 태스크 목록 노출. **숫자 뱃지**를 통해 미처리 태스크 개수 실시간 표시.
        - **회고**: 클릭 시 회고 뷰(`RetrospectiveView`)로 전환.
      - **Overlay Design**: 헤더 상단에 전용 드래그 레이어(`h-8`) 적용 및 상단 여백(`pt-8`) 확보.
      - **Logical Date & Header**: 실시간 시계와 논리적 날짜 표시. 현재 시간이 설정 시간 이전이면 전날의 날짜를 노출하여 업무 연속성 보장.
      - **Daily Progress Bar**: 인사말 하단 배치(h-1.5), 논리적 날짜 기준 완료율 계산.
      - **Task Input Form (Overlay)**: 입력 영역에 포커스 시 `absolute` 포지셔닝을 통해 타임라인 위로 확장되는 **오버레이(Overlay) UX** 적용. 확장 시 `planning_memo` 입력을 위한 넓은 Textarea를 제공하며, 외부 클릭 시 원래 크기로 복구됨. subtle background 및 border 추가로 어포던스 강화.
      - `Timeline`: 컨테이너 상단 여백 확보(`pt-10`) 및 좌측 여백 확장(`pl-28 ml-4`). 시간 레이블을 인디케이터(Dot)의 완전한 좌측(`-left-28`)으로 이동.
        - **Core Time Visualization**: 워크스페이스에 설정된 코어 타임 구간에 포함되는 태스크는 배경색 강조(`bg-accent/5`) 및 좌측 타임라인 선/인디케이터에 **브랜드 컬러 및 글로우(Glow) 효과** 적용.
      - `SortableItem`: 태스크 제목, 상태/시간 범위, 액션 아이콘. 
        - **종료 임박 강조**: 마감 시간이 지난 태스크는 `animate-breathing` 효과 적용.
        - **스타일 통일**: 분절된 블록의 테두리를 모두 실선(Solid)으로 통일.
        - **Unplugged Time Constraints**: '언플러그드 타임' 블록은 드래그 핸들 및 모든 액션 버튼(수정, 삭제 등)을 노출하지 않으며, 상호작용이 불가능한 정적 상태로 렌더링됨.
      - `Modals`: 
        - **WorkspaceCreateModal**: **[1. 기본 정보 / 2. 시간 관리 / 3. 고정 업무]**의 3단계 스텝 구조를 가진 워크스페이스 생성 전용 모달. `h-fit` 컨테이너를 사용하여 콤팩트한 UI 제공. "기본 정보" 탭의 **직무 소개(AI 컨텍스트)** 레이블 및 "시간 관리" 탭의 **언플러그드 타임** 레이블 우측에 `Info` 아이콘 기반 **Tooltip**을 제공하여 각 필드의 역할을 안내. "고정 업무" 탭에서는 `RecurringTaskForm`을 통해 루틴을 미리 등록할 수 있음. 언플러그드 타임 블록 추가 시 `업무 제외 시간 #{N}` 형태로 표시.
        - **TransitionModal**: '완료 처리'와 '연장 처리'를 분리하는 **탭(Tab) 기반 인터페이스**.
        - 삭제 확인, 인박스 전체 이동 확인.
      - **Retrospective View**: AI 회고 생성 및 조회 뷰. 콤팩트한 디자인과 단계별 선택 아키텍처 적용. 상단 전용 드래그 레이어(`h-8`) 및 여백(`pt-8`) 확보.
      - **GlobalSettingsModal**: 닉네임, API Key, 언어 등 사용자 프로필 설정을 위한 독립 모달.
      - **WorkspaceSettingsModal**: 특정 워크스페이스의 이름, 코어 타임, 언플러그드 타임, 고정 업무 등을 관리하는 독립 모달. **[ 기본 정보 / 시간 관리 / 고정 업무 / 고급 설정]**의 4단계 탭 구조와 하단 고정 저장 버튼을 적용하여 정보 위계와 접근성을 최적화함.

  - **Updater Dialog**: 앱 실행 시 새 버전 유무를 확인(`check`)하고, 업데이트가 있을 경우 사용자에게 알림을 주어 다운로드 및 설치(`downloadAndInstall`)를 유도하는 전역 모달. `UpdaterProvider`를 통해 관리됨.

---

## 3. Implemented Features & API

### 👤 User & Settings
- `get_user` / `save_user`: 유저 프로필(닉네임, geminiApiKey, 언어, 알림 활성화 여부) 관리.
- `get_greeting`: 현재 시간과 업무 집중 여부에 따른 동적 메시지.
- **설정 권한 분리**: 전역 설정(PrimarySidebar 하단 톱니바퀴)은 `GlobalSettingsModal`을 통해, 워크스페이스별 설정(사이드바 아이콘 호버)은 `WorkspaceSettingsModal`을 통해 각각 독립적으로 관리.

### 🏢 Workspace & Archive
- `create_workspace` / `update_workspace` / `delete_workspace`: 워크스페이스 설정, Unplugged Time 관리 및 삭제.
- `get_recurring_tasks` / `add_recurring_task` / `delete_recurring_task`: 요일별 고정 업무(루틴) 템플릿 관리.
- **삭제 안전 장치**: 워크스페이스 삭제 시 'Danger Zone'을 통해 확인을 거치며, 실수 방지를 위해 워크스페이스 이름을 직접 입력해야 함. 최소 하나의 워크스페이스는 유지되어야 함. 연쇄 삭제(Cascade Delete)를 통해 관련 태스크 및 회고 데이터 자동 정리.

### ⏳ Timeline Engine (Scheduling)
- `get_timeline`: `day_start_time`을 기준으로 논리적 날짜에 해당하는 블록들만 쿼리.
- `add_task`: 태스크 생성 및 자동 스케줄링. 스마트 라우팅을 통한 마감 시간 초과 업무 인박스 유도.
- `get_today_completed_duration`: 논리적 날짜 기준 완료 업무 합산 시간 계산.
- `process_task_transition`: 업무 종료 시나리오 처리 (`COMPLETE_NOW`, `DELAY` 등).
- `move_to_inbox` / `move_to_timeline`: 타임라인과 인박스 간의 데이터 상태 전환. 인박스 이동 시 해당 태스크가 차지하던 시간만큼 이후의 일정을 앞으로 당김(Pull up).
- `move_all_to_timeline`: 인박스의 모든 태스크를 현재 타임라인 마지막 시점 이후로 일괄 스케줄링.

### ✨ AI Retrospective (Gemini Multi-Model Fallback)
- `generate_retrospective`: 기간별 데이터 수집 및 모델 Fallback 엔진을 통한 AI 회고 생성.
- `get_saved_retrospectives`: 과거 생성 내역 조회.
- `get_active_dates`: 실제 태스크 기록이 있는 날짜 목록을 반환하여 프론트엔드에서 선택 가능한 날짜를 제한하는 데 활용.

### 🚀 Build & Auto-Update
- **Cross-Platform Release**: GitHub Actions를 사용하여 태그(`v*`) 푸시 시 자동으로 아티팩트(DMG, EXE, AppImage 등) 생성 및 Draft 릴리스 생성.
- **Auto-Updater**: Tauri Updater 플러그인을 사용하여 최신 버전 확인 및 백그라운드 다운로드/설치 지원. `TAURI_SIGNING_PUBLIC_KEY`를 통한 바이너리 서명 검증 적용.

### 🛠️ Developer Utilities (Dev Mode Only)
- **CLI Database Control**: 개발 환경(`debug_assertions`)에서 터미널 인자를 통해 데이터베이스를 제어할 수 있습니다.
  - `npm run tauri dev -- -- clear`: 모든 테이블(`users`, `workspaces`, `tasks`, `time_blocks`, `retrospectives`, `unplugged_times`)의 데이터를 삭제합니다.
  - `npm run tauri dev -- -- init`: 데이터베이스를 초기화(`clear`)한 후, 테스트용 유저("TEST"), 워크스페이스("HOME"), 그리고 어제와 오늘의 완료된 업무 데이터(긴급 업무로 인한 분할 시나리오 포함)를 시딩합니다.
---

## 4. User Action Flow (Detailed)

### A. 최초 진입 및 온보딩 (Onboarding Flow)
- **[Trigger]**: 앱 실행 시 `get_user` 결과가 `null`인 경우.
- **[Frontend State]**: `view` 상태가 `"onboarding"`으로 변경.
- **[Flow Details]**:
    1. **닉네임 입력**: 사용자 이름 설정.
    2. **하루 시작 시간**: 논리적 날짜 계산을 위한 기준 시간 설정.
    3. **API Key 설정 & 검증**: Google AI Studio API Key 입력 및 실시간 검증(`fetch_available_models`). 유효하지 않은 키는 에러 메시지를 노출하며, 빈 값은 `건너뛰기` 가능.
    4. **알림 설정**: 시스템 알림 권한 요청.
- **[Backend Command]**: 유저가 최종 제출 시 `save_user` 호출. SQLite `users` 테이블에 유저 정보 저장.
- **[UI Feedback]**: 성공 시 `onComplete` 콜백 실행 -> `view`가 `"main"`으로 변경되며 메인 화면의 Empty State로 진입.

### B. 워크스페이스 생성 및 설정 (Workspace Creation Flow)
- **[Trigger]**: 온보딩 완료 후 Empty State의 중앙 버튼 또는 `PrimarySidebar` 중앙 `+` 버튼 클릭.
- **[Frontend State]**: `isWorkspaceCreateModalOpen` 상태가 `true`로 변경되어 `WorkspaceCreateModal` 오픈.
- **[Backend Command]**: `create_workspace` 호출. `workspaces` 테이블과 `unplugged_times` 테이블에 트랜잭션으로 저장.
- **[UI Feedback]**: 성공 시 모달이 닫히고, 즉시 워크스페이스 목록을 갱신한 뒤 생성된 워크스페이스를 활성화하여 타임라인 뷰로 전환됨.

### C. 프로필/설정 변경 (Settings Flow)
- **[Trigger]**: 
  - **전역 설정**: `PrimarySidebar` 최하단 톱니바퀴 클릭 -> 프로필 탭 활성화 상태로 진입.
  - **워크스페이스 설정**: `PrimarySidebar` 워크스페이스 아이콘 호버 시 나타나는 톱니바퀴 클릭 -> 워크스페이스 탭 활성화 상태로 진입.
- **[Frontend State]**: `view` 상태가 `"settings"`로 변경. `initialTab` 프롭에 따라 초기 탭 결정.
- **[Backend Command]**: `save_user`(프로필) 또는 `update_workspace`(워크스페이스) 호출.
- **[UI Feedback]**: 성공 시 토스트 메시지 노출 및 전역 상태 동기화.

### D. 쾌속 업무 입력 (Task Entry Flow)
- **[Trigger]**: `WorkspaceView` 상단 폼에서 제목, 예상 시간(Time Picker) 입력 후 `Enter` 또는 `추가` 버튼 클릭.
- **[Frontend State]**: 입력 데이터 검증(Zod). `onTaskSubmit` 호출.
- **[Backend Command]**: `add_task` 호출. 마지막 태스크 종료 시점부터 자동 배정. 언플러그드 타임 중복 시 블록 쪼개기 수행.
- **[UI Feedback]**: 타임라인 리렌더링 및 입력 폼 초기화.

### D-2. 업무 내용 수정 및 타임 시프트 (Task Edit Flow)
- **[Trigger]**: 타임라인 내 업무 블록의 `Pencil` 아이콘 클릭 후 폼 수정 및 저장.
- **[Frontend State]**: `EditTaskModal`에서 변경된 제목, 설명, 목표 시간을 바탕으로 `handleEditTaskSubmit` 호출.
- **[Backend Command]**: `update_task` 호출. 
  - `DONE` 상태의 경우 리뷰 메모만 수정 가능. 
  - `NOW` 및 `WILL` 상태의 경우 목표 시간이 초기값 대비 증감되었을 때 해당 블록의 종료 시간을 수정하고, 증감분만큼 `shift_future_blocks`를 트리거하여 전체 타임라인을 당기거나 밀어냄. 또한, 태스크 생성 시 작성한 **'계획(Planning Memo)'** 내용을 수정할 수 있으며, 모달 오픈 시 기존에 저장된 계획 내용이 자동으로 채워져(Pre-fill) 나타납니다. `TimePicker`를 통해 직관적으로 목표 시간을 조정함.
- **[UI Feedback]**: 모달 닫힘. 전체 타임라인 즉각적인 리렌더링 및 후속 일정 재배치 시각화.

### E. 🔥 긴급 업무 입력 및 타임 시프트 (Urgent Task Flow)
- **[Trigger]**: 태스크 입력 시 `🔥 Urgent` 체크박스 활성화 후 추가.
- **[Frontend State]**: `isUrgent: true` 상태로 백엔드 전송.
- **[Backend Command]**: `add_task` 내 긴급 로직 실행.
  1. 현재 진행 중인(`NOW`) 블록을 `PENDING` 상태로 변경하고 종료 시간을 '현재'로 자름.
  2. 긴급 업무를 즉시(`now`) 시작하도록 삽입.
  3. `shift_future_blocks`를 호출하여 중단된 업무의 남은 분량과 이후 모든 일정을 긴급 업무 시간만큼 뒤로 밀기.
- **[UI Feedback]**: 타임라인에 붉은색 강조 표시와 함께 중단된 업무(Pending)와 시프트된 일정들이 즉시 리렌더링됨.

### F. 스마트 라우팅 (Smart Routing Flow)
- **[Trigger]**: 태스크 추가 시 종료 예정 시간이 유저가 설정한 `dayStartTime`(논리적 마감 시간)을 초과할 경우.
- **[UI Feedback]**: "마감 시간 초과" 다이얼로그 팝업.
  - **계속하기**: 무시하고 타임라인에 추가.
  - **인박스로 이동**: 타임라인 대신 인박스(Inbox)에 태스크 저장.

### G. 업무 종료 및 분기 처리 (Task Transition Flow)
- **[Trigger]**: 타임라인 내 `NOW` 상태 블록의 `Check` 아이콘 클릭 또는 종료 시간 도래 시 자동 팝업.
- **[Frontend State]**: `TransitionModal` 오픈.
- **[Backend Command]**: `process_task_transition` 호출.
  - **완료**:제시간 종료, 혹은 현재 시점/과거 시점으로 시간 임의 선택. 목표 시간이 남은 상태에서 조기 종료 시 잉여 시간만큼 이후 일정 당김(Pull up). 목표 시간을 초과하여 지연 종료 시 초과 시간만큼 이후 일정 밀기(Push back).
  - **연장**: 지정된 분만큼 현재 블록 연장 및 이후 일정 밀기.
- **[UI Feedback]**: 모달 닫힘. 타임라인 리렌더링. 2시간 집중 시 건강 관리 알림 토스트 노출.

### H. 워크스페이스 전환 (Workspace Switching Flow)
- **[Trigger]**: `PrimarySidebar`에서 다른 워크스페이스 아이콘 클릭.
- **[Frontend State]**: `activeWorkspaceId` 상태 업데이트.
- **[Backend Command]**: 새로운 워크스페이스 ID로 인사말, 타임라인, 인박스 데이터 재호출.
- **[UI Feedback]**: 해당 워크스페이스의 컨텍스트로 전체 화면 리렌더링.

### I. 인박스 관리 (Inbox Management Flow)
- **[Trigger]**: `WorkspaceView` 헤더 우측의 `Inbox(📥)` 버튼 클릭.
- **[Frontend State]**: `isInboxOpen` 상태 `true` 변경 -> `Sheet` 오버레이 오픈.
- **[Action]**:
  - **인박스로 이동**: 타임라인 내 업무의 `Inbox` 아이콘 클릭 시 해당 업무가 차지하던 시간만큼 이후의 `WILL` 일정들을 앞으로 당김(Pull up).
  - **개별 이동**: 인박스 아이템의 `Send` 버튼 클릭 시 현재 타임라인 마지막 시점 뒤로 배정.
  - **전체 이동**: `전체 이동` 버튼 클릭 시 인박스의 모든 태스크를 일괄 스케줄링.
  - **삭제**: 인박스 아이템의 `X` 버튼 클릭으로 태스크 삭제.
- **[UI Feedback]**: 타임라인을 가리지 않고 오버레이를 통해 태스크 관리 가능.

### J. AI 회고 진입 및 조회 (AI Retrospective Flow)
- **[Trigger]**: `WorkspaceView` 헤더 우측의 `Sparkles(✨)` 버튼 클릭.
- **[Frontend State]**: `view`가 `"retrospective"`로 변경.
- **[Action]**:
  - **생성**: 기간(일/주/월) 및 날짜 선택 -> `회고 생성하기` 클릭 -> AI 엔진(Fallback 포함) 가동 -> 결과 모달 노출.
  - **조회**: `회고 조회` 탭 -> 과거 생성된 회고 리스트 확인 및 마크다운 렌더링.
- **[UI Feedback]**: 생성 완료 시 데스크탑 알림 발송.

### K. 태스크 삭제 및 분할 처리 (Task Deletion Flow)
- **[Trigger]**: 타임라인 블록의 `X` 버튼 클릭.
- **[UI Feedback]**: 확인 다이얼로그 팝업.
  - **일반 태스크**: 단순 삭제 확인.
  - **분할된 태스크**: "전체 삭제" 또는 "이전 기록 유지(완료 처리)" 분기 선택.
- **[Backend Command]**: `delete_task` 또는 `handle_split_task_deletion` 호출.

### L. 자동 상태 전환 및 동기화 (Auto-Transition Flow)
- **[Trigger]**: `App` 내 1초 주기 타이머와 `fetchMainData`에 의한 실시간 체크.
- **[Logic]**:
  - 현재 `NOW` 블록이 없고 다음 `WILL` 블록의 시작 시간이 되었을 때 -> `update_block_status` 호출하여 `NOW`로 승격.
  - `NOW` 블록의 종료 시간이 지났을 때 -> `TransitionModal` 자동 팝업 및 알림 발송.
- **[UI Feedback]**: 별도의 조작 없이도 업무 상태가 실시간으로 강조 및 전환됨.

### M. 자동 업데이트 확인 및 실행 (Auto-Update Flow)
- **[Trigger]**: 앱 실행(`mount`) 시 `UpdaterProvider`에서 `check()` 호출.
- **[Frontend State]**: 새 버전이 있을 경우 `update` 상태 업데이트 및 `Dialog` 오픈.
- **[Action]**: 유저가 `업데이트` 클릭 시 `downloadAndInstall()` 실행 후 `relaunch()`를 통해 앱 재시작.
- **[UI Feedback]**: 업데이트 중 `Loader` 애니메이션 노출 및 완료 후 자동 재시작.

### N. 고정 업무 관리 및 루틴 제안 (Routine Flow)
- **[Trigger]**: 
  - **관리**: 워크스페이스 설정 내 '고정 업무' 탭 진입.
  - **제안**: 현재 요일에 해당하는 고정 업무 템플릿이 존재하고, 아직 오늘 타임라인/인박 스에 등록되지 않은 경우 `WorkspaceView` 상단에 노출.
- **[Action]**:
  - **등록**: `RecurringTaskForm`을 통해 제목, 예상 시간, 반복 요일, 계획 메모를 설정하 여 저장. `TimePicker` 컴포넌트를 사용하여 직관적인 시간 설정을 지원하며, 중첩 폼(Nested Form) 문제를 해결하여 페이지 새로고침 없이 안정적으로 동작합니다.
  - **추가**: 제안 바의 루틴 칩 클릭 시 해당 템플릿 정보를 복사(Hard Copy)하여 타임라인 에 즉시 태스크로 등록.
- **[UI Feedback]**: 
  - 루틴 추가 시 제안 바에서 해당 칩이 애니메이션과 함께 사라짐.
  - 설정에서 템플릿을 삭제해도 이미 등록된 태스크 데이터는 유지됨.

---

## 5. Time Shift Use Cases & Test Scenarios

타임라인의 정교한 관리를 위해 모든 시프트 상황을 커버하는 테스트 시나리오를 정의합니다.

### 5.1 업무 생성 및 자동 스케줄링 (Add Task)
- [ ] **일반 업무 추가**: 마지막 업무 종료 후 즉시 시작되는지 확인.
- [ ] **첫 업무 추가**: 타임라인에 업무가 없을 때 현재 시간(Now)부터 시작되는지 확인.
- [ ] **언플러그드 타임 중첩**: 업무 생성 시 언플러그드 타임과 겹치면 자동으로 블록이 분할(Split)되는지 검증.
- [ ] **마감 시간 초과**: 업무 종료 예정 시간이 `dayStartTime`을 초과할 때 인박스 이동 팝업 및 처리 확인.

### 5.2 긴급 업무 (Urgent Task)
- [ ] **진행 중 업무 중단**: `NOW` 상태 업무를 `PENDING`으로 자르고 긴급 업무를 즉시 삽입하는 로직 검증.
- [ ] **연쇄 시프트**: 중단된 업무의 남은 분량과 이후의 모든 `WILL` 블록들이 긴급 업무 시간만큼 정확히 밀리는지 확인.
- [ ] **무상태 시 긴급 추가**: 진행 중인 업무가 없을 때 즉시 시작하고 미래 블록들을 미는지 확인.

### 5.3 타임 시프트 - 밀기 (Push Back)
- [ ] **업무 지연/연장**: `DELAY` 또는 `update_task`를 통해 목표 시간을 늘릴 때 이후 `WILL` 블록들이 동일 시간만큼 밀리는지 확인.
- [ ] **언플러그드 타임 재진입**: 시프트된 블록이 언플러그드 타임 내부로 밀려 들어갈 경우, 다시 분할(Split)되거나 건너뛰는지 확인 (현재 구현은 단순 오프셋 이동이므로 이 케이스에 대한 고도화 검증 필요).

### 5.4 타임 시프트 - 당기기 (Pull Up)
- [ ] **조기 종료**: 예정보다 일찍 업무 완료(`COMPLETE_NOW`, `COMPLETE_AGO`) 시 잉여 시간만큼 이후 일정들이 앞당겨지는지 확인.
- [ ] **삭제/인박스 이동**: 중간 업무 제거 시 뒤의 업무들이 공백 없이 당겨지며 타임라인 연속성이 유지되는지 확인.
- [ ] **분할 업무 복합 당기기**: 여러 블록으로 나뉜 업무를 인박스로 보낼 때, 각 블록이 차지하던 모든 시간의 합만큼 정확히 당겨지는지 검증.

### 5.5 복합 및 예외 시나리오
- [ ] **마감 시간 임계점**: 시프트로 인해 업무가 논리적 마감 시간(`dayStartTime`)을 넘기게 될 때의 데이터 정합성 확인.
- [ ] **과거 시점 완료**: `COMPLETE_AGO`를 통해 현재 시간보다 훨씬 이전 시점으로 종료 시간을 설정했을 때의 시프트 동작.
- [ ] **빈 타임라인 시프트**: 업무가 하나만 있거나 뒤에 업무가 없을 때 시프트 로직이 에러 없이 동작하는지 확인.


