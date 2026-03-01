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
      - `Header`: 실시간 시계(HH시 mm분 ss초), 오늘 날짜 표시, 지능형 인사말, 태스크 입력 폼.
      - `Task Input Form`: 커스텀 Time Picker(Popover), 긴급 여부, 메모 입력.
      - `Timeline`: `SortableContext` 내부의 `SortableItem` 리스트. 드래그 가능.
      - `Modals`: 업무 종료 분기 처리(`TransitionModal`), 삭제 확인, 인박스 전체 이동 확인.
    - **Retrospective View**: 
      - **Create Tab**: Generate daily/weekly/monthly AI retrospectives. Uses a high-fidelity `DateSelector`:
        - **Daily**: Integrated `Calendar` view that highlights and enables only dates with actual task data (`activeDates`).
        - **Weekly/Monthly**: Intelligent 'Stepper' UI with `prev`/`next` buttons to navigate periods within the available data range.
      - **Browse Tab**: Shares the same `DateSelector` logic for consistency. Immediate DB query on period change and high-fidelity markdown rendering.
      - **Layout**: Optimized for content visibility by removing redundant labels (Final Label, Selected Range) and compacting the selection area.
      - **Header**: Standardized with a "Latest Retrospective" button for quick access.
    - **Settings View**: 사이드바 기반 탭 전환 (프로필 / 워크스페이스).

    ---

    ## 3. Implemented Features & API

    ### 👤 User & Settings
    - `get_user` / `save_user`: 유저 프로필(닉네임, geminiApiKey, 언어) 관리.
    - `get_greeting`: 현재 시간(새벽/아침/점심 등)과 업무 집중 여부에 따른 동적 메시지.

    ### 🏢 Workspace & Archive
    - `create_workspace` / `update_workspace`: 워크스페이스 설정 및 Unplugged Time(배정 제외 시간) 관리.
    - `SecondarySidebar`: 인박스 태스크 관리, 워크스페이스 설정/회고 바로가기, 접기/펼치기 토글 기능.

    ### ⏳ Timeline Engine (Scheduling)
    - `add_task`: 태스크 생성 및 자동 스케줄링.
    - `schedule_task_blocks`: Unplugged Time 회피 및 블록 분할 로직.
    - `shift_future_blocks`: 업무 시간 변동 시 이후 모든 `WILL` 블록 밀기.
    - `reorder_blocks`: Dnd-kit의 `arrayMove` 결과를 DB에 반영하고 시간 재계산.
    - `process_task_transition`: 업무 종료 시나리오 처리 (`COMPLETE_NOW`, `DELAY` 등).
    - `move_to_inbox` / `move_to_timeline`: 타임라인과 인박스 간의 데이터 상태 전환.
    - `move_all_to_timeline`: 인박스의 모든 태스크를 현재 타임라인 마지막 시점 이후로 일괄 스케줄링.

    ### ✨ AI Retrospective (Gemini Multi-Model Fallback)
    - `generate_retrospective`: 
      1. 기간 선택(`DAILY`, `WEEKLY`, `MONTHLY`)에 따른 동적 입력 폼(`type="date/week/month"`) 제공.
      2. 선택된 기간의 모든 `DONE` 블록과 `planning_memo`, `review_memo`를 수집.
      3. **데이터 정합성**: 생성 전 DB를 조회하여 동일 기간/유형의 회고가 이미 존재하는지 확인 및 중복 생성 차단.
      4. **모델 Fallback 엔진**: 
         - 로컬 DB에 캐싱된 `last_successful_model` 우선 시도.
         - 실패 시 `/v1/models`에서 가용 모델 목록 호출 및 필터링(`generateContent` 지원 여부).
         - 우선순위(`flash-lite` -> `flash` -> `pro`) 및 버전별 재시도 체인 가동.
         - 429(Quota Exceeded) 또는 503 에러 발생 시 즉시 다음 모델로 전환.
      5. **프롬프트 엔지니어링**:
         - 기간별 영문 System Prompt 분기 및 유저 설정 언어(`ko/en`) 강제 규칙 적용.
         - 모델 스펙에 따라 `system_instruction` 필드 또는 프롬프트 결합(Concatenation) 방식 자동 선택.
      6. 성공 시 해당 모델명을 캐싱하고 결과를 DB에 저장 (`used_model` 포함).
    - `get_saved_retrospectives` / `get_latest_saved_retrospective`: 과거 생성 내역 조회 (`used_model` 정보 포함).
    - `get_active_dates`: 실제 태스크 기록이 있는 날짜 목록을 반환하여 프론트엔드에서 선택 가능한 날짜를 제한하는 데 활용.

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
    - **[Trigger]**: `WorkspaceView` 상단 폼에서 제목, 시간(Time Picker) 입력 후 `Enter` 또는 `추가` 버튼 클릭.
    - **[Frontend State]**: `taskForm.handleSubmit` 실행. 입력 데이터 검증(Zod).
    - **[Backend Command]**: `add_task` 호출. 마지막 태스크 종료 시점부터 자동 배정. 언플러그드 타임 중복 시 블록 쪼개기 수행.
    - **[UI Feedback]**: `fetchMainData`를 통해 타임라인 리렌더링. 입력 폼 초기화.

    ### E. 🔥 긴급 업무 입력 및 타임 시프트 (Urgent Task Flow)
    - **[Trigger]**: 태스크 입력 시 `🔥 Urgent` 체크박스 활성화 후 추가.
    - **[Frontend State]**: `isUrgent: true` 상태로 백엔드 전송.
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
    - **[Trigger]**: `SecondarySidebar` 내 `회고` 버튼 클릭 후 타입(일간/주간/월간) 선택.
    - **[Frontend State]**: 
      - 선택한 타입에 따라 `<input>`의 `type`이 `date`, `week`, `month`로 자동 전환.
      - `date-fns`를 통해 선택된 기간의 실제 `startDate`, `endDate` 및 `dateLabel` 계산.
      - `isGenerating` 상태 `true` 변경 (로딩 스피너 및 안내 문구 노출).
    - **[Backend Command]**: `generate_retrospective` 호출. 
      - 앞서 설명한 **모델 Fallback 엔진**을 통해 최적의 Gemini 모델로 회고 생성.
      - 유저의 `role_intro`와 태스크 리스트(`planning/review memo` 포함)를 기반으로 고품질 마크다운 생성.
    - **[UI Feedback]**: 생성 완료 후 데스크탑 알림 발송. 마크다운 결과가 담긴 `Dialog` 모달 오픈.

    ### H. 워크스페이스 전환 (Workspace Switching Flow)
    - **[Trigger]**: `PrimarySidebar`에서 다른 워크스페이스 아이콘 클릭.
    - **[Frontend State]**: `activeWorkspaceId` 상태 업데이트. `view`를 `"main"`으로 고정.
    - **[Backend Command]**: `get_greeting`, `get_timeline`, `get_inbox`를 새로운 `workspaceId`로 재호출.
    - **[UI Feedback]**: 해당 워크스페이스의 타임라인과 인박스 데이터로 화면 리렌더링.

    ### I. 2차 사이드바 관리 (Sidebar Management Flow)
    - **[Trigger]**: `SecondarySidebar` 상단의 꺽쇠 아이콘 클릭.
    - **[Frontend State]**: `isCollapsed` 상태 토글. `MainLayout`의 사이드바 너비 애니메이션 실행.
    - **[UI Feedback]**: 사이드바가 80px(아이콘만 표시) 또는 256px(텍스트 포함)로 부드럽게 전환됨.

    ### J. 인박스 및 드래그 앤 드롭 (Inbox & Dnd Flow)
    - **[Trigger]**:
    - 타임라인 블록을 인박스 영역으로 드래그하거나 `Inbox` 아이콘 클릭.
    - 인박스 아이템을 타임라인 영역으로 드래그하거나 `Send` 아이콘 클릭.
    - 타임라인 내에서 블록 간 순서 변경.
    - **[Frontend State]**: `DndContext` 내 `handleDragEnd` 이벤트 발생. `arrayMove`로 로컬 상태 선반영.
    - **[Backend Command]**:
    - `move_to_inbox`: 타임라인 블록 삭제 및 원본 태스크를 인박스 상태로 전환.
    - `move_to_timeline`: 인박스 태스크를 타임라인 마지막 시점에 스케줄링.
    - `reorder_blocks`: 변경된 순서 리스트를 전달하여 전체 시간 재계산 및 저장.
    - **[UI Feedback]**: 데이터 정합성 유지를 위해 `fetchMainData` 재실행 및 타임라인 정렬.
### K. 태스크 삭제 (Task Deletion Flow)
- **[Trigger]**: 타임라인 블록 또는 인박스 아이템의 `X` 버튼 클릭 후 확인 모달에서 승인.
- **[Frontend State]**: `deleteTaskId` 상태에 ID 저장 및 확인 `Dialog` 오픈.
- **[Backend Command]**: `delete_task` 호출. `ON DELETE CASCADE` 설정에 의해 연결된 `time_blocks`도 자동 삭제됨.
- **[UI Feedback]**: 목록에서 해당 항목 제거. 삭제 완료 토스트 알림(구현 시).

### L. 자동 업무 상태 전환 및 마감 알림 (Auto-Transition Flow)
- **[Trigger]**: `App.tsx`의 1초 주기 타이머에 의해 `fetchMainData`가 실행됨.
- **[Frontend State]**: 
  - `NOW` 블록이 없고 다음 `WILL` 블록의 `start_time`이 현재 시간을 지난 경우 -> `update_block_status` 호출.
  - 현재 `NOW` 블록의 `end_time`이 현재 시간을 지난 경우 -> `transitionBlock` 상태 업데이트 및 `Transition Modal` 자동 오픈.
- **[Backend Command]**: `update_block_status`를 통해 `WILL` 블록을 `NOW`로 변경.
- **[UI Feedback]**: 
  - 타임라인의 해당 블록 색상이 강조(`accent`) 컬러로 변경되고 애니메이션 활성화.
  - 마감 시간이 지난 경우 붉은색 강조 및 `Overdue` 뱃지 노출, 상태 전환 모달 팝업.

