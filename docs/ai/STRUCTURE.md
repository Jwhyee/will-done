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
  - `workspace/`: 메인 타임라인 (`WorkspaceView`) 및 태스크 관리 컴포넌트 (`SortableItem`, `InboxItem`).
    - `components/`: `TimePicker`, `TransitionModal`.
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

애플리케이션은 `AppContent` 내의 `view` 상태에 따라 전체 화면을 전환합니다.

- **Root**: `App` (`AppProvider` -> `DndContext`)
  - **Loading**: 초기 `get_user` 및 `get_workspaces` 호출 중 노출.
  - **Onboarding**: 유저 정보가 없을 때 강제 진입. 닉네임/언어 설정 모달.
  - **WorkspaceSetup**: 워크스페이스가 없을 때 진입. 워크스페이스 이름, 집중 시간, 역할 설정.
  - **Main View** (`MainLayout` 기반):
    - `PrimarySidebar` (L1): 워크스페이스 아이콘 리스트 (56px/w-14), 추가 버튼, 그리고 최하단에 전역 설정(톱니바퀴) 버튼 배치. 각 워크스페이스 아이콘 호버 시 워크스페이스 설정 진입용 작은 톱니바퀴 아이콘 노출.
    - `WorkspaceView` (Content): `PrimarySidebar` 우측의 모든 공간을 차지하는 메인 작업 영역.
      - **Header Actions**: 우측 상단에 **인박스(📥)**와 **회고(✨)** 버튼 배치. 
        - **인박스**: 클릭 시 우측에서 `Sheet`(shadcn/ui)가 슬라이드되어 나오며 인박스 태스크 목록 노출. 타임라인의 맥락을 유지하며 태스크 관리 가능.
        - **회고**: 클릭 시 회고 뷰(`RetrospectiveView`)로 전환.
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
      - **Retrospective View**: AI 회고 생성 및 조회 뷰. 콤팩트한 디자인과 단계별 선택 아키텍처 적용.
      - **Settings View**: 사이드바 기반 탭 전환 (프로필 / 워크스페이스).

---

## 3. Implemented Features & API

### 👤 User & Settings
- `get_user` / `save_user`: 유저 프로필(닉네임, geminiApiKey, 언어, 알림 활성화 여부) 관리.
- `get_greeting`: 현재 시간과 업무 집중 여부에 따른 동적 메시지.

### 🏢 Workspace & Archive
- `create_workspace` / `update_workspace`: 워크스페이스 설정 및 Unplugged Time 관리.
- **설정 권한 분리**: 전역 설정(PrimarySidebar 하단)과 워크스페이스별 설정(아이콘 호버)으로 진입점 이원화.

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

---

## 4. User Action Flow (Detailed)

### C. 프로필/설정 변경 (Settings Flow)
- **[Trigger]**: 
  - **전역 설정**: `PrimarySidebar` 최하단 톱니바퀴 클릭 -> 프로필 탭 활성화 상태로 진입.
  - **워크스페이스 설정**: `PrimarySidebar` 워크스페이스 아이콘 호버 시 나타나는 톱니바퀴 클릭 -> 워크스페이스 탭 활성화 상태로 진입.
- **[Frontend State]**: `view` 상태가 `"settings"`로 변경. `initialTab` 프롭에 따라 초기 탭 결정.
- **[Backend Command]**: `save_user`(프로필) 또는 `update_workspace`(워크스페이스) 호출.

### G. AI 회고 진입 (AI Retrospective Entry)
- **[Trigger]**: `WorkspaceView` 헤더 우측의 `Sparkles(✨)` 버튼 클릭.
- **[Frontend State]**: `view`가 `"retrospective"`로 변경.

### J. 인박스 관리 (Inbox Management Flow)
- **[Trigger]**: `WorkspaceView` 헤더 우측의 `Inbox(📥)` 버튼 클릭.
- **[Frontend State]**: `isInboxOpen` 상태 `true` 변경 -> `Sheet` 오버레이 오픈.
- **[UI Feedback]**: 타임라인을 가리지 않고 인박스 아이템 확인 및 타임라인 이동(`Send`) 버튼 사용 가능.
