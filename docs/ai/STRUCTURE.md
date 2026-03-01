# Project State Map: will-done

이 문서는 "will-done" 프로젝트의 현재 구현 상태를 정의하는 지도입니다. 모든 개발 스프린트는 이 구조를 기반으로 하며, 변경 사항 발생 시 이 문서도 업데이트되어야 합니다.

---

## 1. Directory Architecture

### 📂 Frontend (`src/`)
- `App.tsx`: 애플리케이션의 루트 컴포넌트이자 뷰 전환(Switching) 엔진.
- `main.tsx`: React 엔트리 포인트 및 전역 스타일 로드.
- `components/`: 재사용 가능한 UI 및 레이아웃 컴포넌트.
  - `layout/`: `MainLayout`, `PrimarySidebar`, `SecondarySidebar`.
  - `ui/`: shadcn/ui 기반 원자적 컴포넌트 (버튼, 입력창, 다이얼로그 등).
- `features/`: 도메인별 핵심 비즈니스 뷰 및 컴포넌트.
  - `onboarding/`: 사용자 초기 설정 및 워크스페이스 생성 뷰.
  - `workspace/`: 메인 타임라인 및 태스크 관리 뷰 (`WorkspaceView`).
  - `retrospective/`: 과거 수행 내역 조회 및 AI 회고 뷰.
  - `settings/`: 프로필 및 워크스페이스 설정 뷰.
- `providers/`: 전역 상태 관리를 위한 Context Providers (`AppProvider`, `ToastProvider`).
- `lib/`: 유틸리티 (`utils.ts`) 및 다국어 처리 (`i18n.ts`).
- `types/`: TypeScript 인터페이스 정의 (`index.ts`).

### 📂 Backend (`src-tauri/`)
- `src/lib.rs`: 모든 Tauri Command, 데이터 엔티티(Struct), SQLite 비즈니스 로직 포함.
- `src/main.rs`: Tauri 앱 초기화 및 커맨드 핸들러 등록.
- `Cargo.toml`: Rust 의존성 관리 (`sqlx`, `tokio`, `serde`, `reqwest` 등).

---

## 2. UI Layout Hierarchy

애플리케이션은 `AppContent` 내의 `view` 상태(`loading`, `onboarding`, `workspace_setup`, `main`, `retrospective`, `settings`)에 따라 전체 화면을 전환합니다.

- **Root**: `App` (`AppProvider`)
  - **Loading**: 초기 데이터 로딩 화면.
  - **Onboarding**: 닉네임/언어 설정.
  - **WorkspaceSetup**: 초기 워크스페이스 및 집중 시간(Unplugged) 설정.
  - **Main View** (`MainLayout` 기반):
    - `PrimarySidebar` (L1): 워크스페이스 전환 바.
    - `SecondarySidebar` (L2): 달력, 인박스(Inbox), 설정 버튼.
    - `WorkspaceView` (Content): 인사말(Greeting), 타임라인(Timeline), 태스크 추가 폼.
      - `SortableItem`: 타임라인 내 개별 시간 블록 (Dnd-kit 적용).
      - `InboxItem`: 인박스 내 대기 중인 태스크.
  - **Retrospective View**: 메인 화면을 대체하여 전체 화면으로 AI 회고 및 과거 데이터 표시.
  - **Settings View**: 메인 화면을 대체하여 프로필 및 워크스페이스 수정 화면 표시.

---

## 3. Implemented Features & API

### 👤 User & Settings
- `get_user` / `save_user`: 닉네임, Gemini API 키, 언어 설정 관리.
- `get_greeting`: 시간대와 현재 업무 상태에 따른 동적 인사말 생성.

### 🏢 Workspace
- `create_workspace` / `get_workspaces` / `update_workspace`: 워크스페이스 정보 및 Unplugged Time 설정.
- `get_active_dates`: 데이터가 존재하는 날짜 리스트 조회 (달력 표시용).

### ⏳ Timeline Engine (Core)
- `get_timeline`: 특정 날짜의 타임라인 블록(Task + Unplugged) 조회.
- `add_task`: 새로운 태스크 생성 및 자동 스케줄링 (자정 제한 및 Unplugged 회피 로직 포함).
- `reorder_blocks`: 드래그 앤 드롭을 통한 타임라인 순서 재배치 및 시간 재계산.
- `process_task_transition`: 태스크 상태 전환 (`COMPLETE_NOW`, `DELAY` 등) 및 이후 일정 밀기(Shift).
- `move_to_inbox` / `move_to_timeline`: 타임라인과 인박스 간 태스크 이동.

### ✨ AI Retrospective
- `generate_retrospective`: 특정 기간의 `DONE` 태스크를 분석하여 Gemini API로 회고록 생성.
- `get_saved_retrospectives`: DB에 저장된 과거 회고록 조회.

---

## 4. User Action Flow

### A. 태스크 추가 및 스케줄링 Flow
1. **User**: `WorkspaceView` 상단 폼에서 태스크명과 예상 시간 입력 후 제출.
2. **Frontend**: `invoke("add_task", { ... })` 호출.
3. **Backend**: 
   - 마지막 블록의 `end_time` 확인.
   - `unplugged_times`를 체크하여 시간이 겹치면 해당 구간을 건너뛰고 블록 분할(`schedule_task_blocks`).
   - SQLite에 `time_blocks` 저장.
4. **Frontend**: `fetchMainData()`를 통해 타임라인 리렌더링.

### B. 태스크 완료 및 시간 조정 (Transition) Flow
1. **User**: 현재 진행 중인 업무(`NOW` 상태)의 완료 버튼 클릭.
2. **Frontend**: `onTransition` 호출 -> `process_task_transition` 커맨드 전송.
3. **Backend**:
   - 실제 완료 시간(`COMPLETE_NOW`) 기록.
   - 원래 예정된 종료 시간과의 차이(diff) 계산.
   - `shift_future_blocks`를 호출하여 이후의 모든 `WILL` 상태 블록들의 시간을 밀거나 당김.
4. **Frontend**: 업데이트된 타임라인 표시 및 토스트 알림.

### C. AI 회고 생성 Flow
1. **User**: `SecondarySidebar`의 달력에서 과거 날짜 클릭 또는 `RetrospectiveView` 진입.
2. **Frontend**: `invoke("generate_retrospective", { ... })` 호출.
3. **Backend**:
   - 해당 기간의 `DONE` 태스크 및 `review_memo` 수집.
   - Gemini API에 프롬프트 전달 (Markdown 형식 요청).
   - 생성된 내용을 `retrospectives` 테이블에 저장.
4. **Frontend**: `Dialog` 모달을 통해 Markdown 결과물 렌더링.
