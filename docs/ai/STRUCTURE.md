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
  - `onboarding/`: 사용자 초기 설정 (`OnboardingView`) 및 워크스페이스 생성 뷰 (`WorkspaceSetupView`).
  - `workspace/`: 메인 타임라인 (`WorkspaceView`).
    - `components/`: `TimePicker`, `TransitionModal`, `DroppableArea`, `InboxItem`, `SortableItem`, `TaskForm`, `WorkspaceDialogs`, `WorkspaceHeader`, `WorkspaceInbox`, `WorkspaceTimeline`.
    - `hooks/`: `useWorkspace.ts`.
  - `retrospective/`: 과거 수행 내역 조회 및 AI 회고 생성 뷰 (`RetrospectiveView`).
    - `components/`: `DateSelector`, `Stepper`.
    - `utils.ts`: 기간 계산 및 포맷팅 유틸리티.
  - `settings/`: 프로필 및 워크스페이스 수정 화면 (`SettingsView`).
- `providers/`: 전역 상태 관리를 위한 Context Providers (`AppProvider`, `ToastProvider`).
- `hooks/`: 비즈니스 로직 캡슐화를 위한 커스텀 훅 (`useApp`).
- `lib/`: 유틸리티 (`utils.ts`) 및 다국어 처리 (`i18n.ts`).
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

---

## 2. UI Layout Hierarchy

애플리케이션은 `AppContent` 내의 `view` 상태에 따라 전체 화면을 전환하며, **프레임리스 오버레이(Overlay) 타이틀 바** 디자인을 적용하여 모던한 데스크톱 경험을 제공합니다.

- **Window**: `titleBarStyle: Overlay` 적용. 다크 테마 강제 및 창 제어 버튼(신호등) 유지.
- **Root**: `App` (`AppProvider` -> `DndContext`)
  - **Loading**: 초기 `get_user` 및 `get_workspaces` 호출 중 노출. 상단 전용 드래그 레이어(`h-8`) 적용.
  - **Onboarding**: 유저 정보가 없을 때 강제 진입. **[1. 닉네임 / 2. 하루 시작 시간 / 3. API Key / 4. 알림 설정]**의 4단계 대화형 멀티 스텝 구조를 적용. 타이틀과 서브타이틀의 위계를 분리하여 시각적 명확성을 높이고, 점(Dot) 형태의 인디케이터를 통해 진행 상태를 직관적으로 제공함. 배경에 드래그 레이어(`h-8`) 적용.
  - **WorkspaceSetup**: 워크스페이스가 없을 때 진입. **[1. 기본 정보 / 2. 시간 및 역할]**의 2단계 스텝 구조와 하단 고정 생성 버튼을 적용. 배경에 드래그 레이어(`h-8`) 적용.
  - **Main View** (`MainLayout` 기반):
    - `PrimarySidebar` (L1): 워크스페이스 아이콘 리스트 (56px/w-14), 추가 버튼, 그리고 최하단에 전역 설정(톱니바퀴) 버튼 배치. 
      - **Overlay Design**: 상단에 macOS 신호등 공간 충분히 확보(`pt-8`) 및 전용 드래그 레이어(`h-8`) 설정.
    - `WorkspaceView` (Content): `PrimarySidebar` 우측의 모든 공간을 차지하는 메인 작업 영역.
      - **Header Actions**: 우측 상단에 **인박스(📥)**와 **회고(✨)** 버튼 배치. 
        - **인박스**: 클릭 시 우측에서 `Sheet`(shadcn/ui)가 슬라이드되어 나오며 인박스 태스크 목록 노출. **숫자 뱃지**를 통해 미처리 태스크 개수 실시간 표시.
        - **회고**: 클릭 시 회고 뷰(`RetrospectiveView`)로 전환.
      - **Overlay Design**: 헤더 상단에 전용 드래그 레이어(`h-8`) 적용 및 상단 여백(`pt-8`) 확보.
      - **Logical Date & Header**: 실시간 시계와 논리적 날짜 표시. 현재 시간이 설정 시간 이전이면 전날의 날짜를 노출하여 업무 연속성 보장.
      - **Daily Progress Bar**: 인사말 하단 배치(h-1.5), 논리적 날짜 기준 완료율 계산.
      - **Task Input Form**: 입력 영역에 subtle background 및 border 추가로 어포던스 강화.
      - `Timeline`: 컨테이너 상단 여백 확보(`pt-10`) 및 좌측 여백 확장(`pl-28 ml-4`). 시간 레이블을 인디케이터(Dot)의 완전한 좌측(`-left-28`)으로 이동.
      - `SortableItem`: 태스크 제목, 상태/시간 범위, 액션 아이콘. 
        - **종료 임박 강조**: 마감 시간이 지난 태스크는 `animate-breathing` 효과 적용.
        - **스타일 통일**: 분절된 블록의 테두리를 모두 실선(Solid)으로 통일.
      - `Modals`: 
        - **TransitionModal**: '완료 처리'와 '연장 처리'를 분리하는 **탭(Tab) 기반 인터페이스**.
        - 삭제 확인, 인박스 전체 이동 확인.
      - **Retrospective View**: AI 회고 생성 및 조회 뷰. 콤팩트한 디자인과 단계별 선택 아키텍처 적용. 상단 전용 드래그 레이어(`h-8`) 및 여백(`pt-8`) 확보.
      - **GlobalSettingsModal**: 닉네임, API Key, 언어 등 사용자 프로필 설정을 위한 독립 모달.
      - **WorkspaceSettingsModal**: 특정 워크스페이스의 이름, 코어 타임, 언플러그드 타임 등을 관리하는 독립 모달. **[기본 정보 / 시간 관리 / 고급 설정]**의 3단계 탭 구조와 하단 고정 저장 버튼을 적용하여 정보 위계와 접근성을 최적화함.

---

## 3. Implemented Features & API

### 👤 User & Settings
- `get_user` / `save_user`: 유저 프로필(닉네임, geminiApiKey, 언어, 알림 활성화 여부) 관리.
- `get_greeting`: 현재 시간과 업무 집중 여부에 따른 동적 메시지.
- **설정 권한 분리**: 전역 설정(PrimarySidebar 하단 톱니바퀴)은 `GlobalSettingsModal`을 통해, 워크스페이스별 설정(사이드바 아이콘 호버)은 `WorkspaceSettingsModal`을 통해 각각 독립적으로 관리.

### 🏢 Workspace & Archive
- `create_workspace` / `update_workspace` / `delete_workspace`: 워크스페이스 설정, Unplugged Time 관리 및 삭제.
- **삭제 안전 장치**: 워크스페이스 삭제 시 'Danger Zone'을 통해 확인을 거치며, 실수 방지를 위해 워크스페이스 이름을 직접 입력해야 함. 최소 하나의 워크스페이스는 유지되어야 함. 연쇄 삭제(Cascade Delete)를 통해 관련 태스크 및 회고 데이터 자동 정리.

### ⏳ Timeline Engine (Scheduling)
- `get_timeline`: `day_start_time`을 기준으로 논리적 날짜에 해당하는 블록들만 쿼리.
- `add_task`: 태스크 생성 및 자동 스케줄링. 스마트 라우팅을 통한 마감 시간 초과 업무 인박스 유도.
- `get_today_completed_duration`: 논리적 날짜 기준 완료 업무 합산 시간 계산.
- `process_task_transition`: 업무 종료 시나리오 처리 (`COMPLETE_NOW`, `DELAY` 등).
- `move_to_inbox` / `move_to_timeline`: 타임라인과 인박스 간의 데이터 상태 전환.
- `move_all_to_timeline`: 인박스의 모든 태스크를 현재 타임라인 마지막 시점 이후로 일괄 스케줄링.

### ✨ AI Retrospective (Gemini Multi-Model Fallback)
- `generate_retrospective`: 기간별 데이터 수집 및 모델 Fallback 엔진을 통한 AI 회고 생성.
- `get_saved_retrospectives`: 과거 생성 내역 조회.
- `get_active_dates`: 실제 태스크 기록이 있는 날짜 목록을 반환하여 프론트엔드에서 선택 가능한 날짜를 제한하는 데 활용.

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
- **[UI Feedback]**: 성공 시 `onComplete` 콜백 실행 -> `view`가 `"workspace_setup"`으로 변경되며 워크스페이스 생성 화면으로 전환.

### B. 워크스페이스 생성 및 설정 (Workspace Setup Flow)
- **[Trigger]**: 온보딩 완료 직후 또는 `PrimarySidebar` 중앙 `+` 버튼 클릭.
- **[Frontend State]**: `view` 상태가 `"workspace_setup"`으로 변경.
- **[Backend Command]**: `create_workspace` 호출. `workspaces` 테이블과 `unplugged_times` 테이블에 트랜잭션으로 저장.
- **[UI Feedback]**: 성공 시 `view`가 `"main"`으로 변경되고 해당 워크스페이스가 활성화됨.

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
- **[Trigger]**: 타임라인 내 `NOW` 상태 블록의 `Pencil` 아이콘 클릭 또는 종료 시간 도래 시 자동 팝업.
- **[Frontend State]**: `TransitionModal` 오픈. **완료(Complete)**와 **연장(Extension)** 탭 중 선택.
- **[Backend Command]**: `process_task_transition` 호출.
  - **완료**: 실제 완료 시점으로 시간을 고정하고 리뷰 메모 저장. 이후 일정 당김/밀기.
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

