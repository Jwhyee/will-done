### 🏃 will-done MVP Development Sprints (AI Prompt Guide)

#### Sprint 1: 핵심 DB 스키마 설계 및 온보딩 (Backend)

```text
@docs/ai/PLANNING.md 그리고 @docs/ai/DESIGN.md 파일을 읽고 Sprint 1 (Backend) 개발을 시작해 줘.

**[목표]**
Tauri와 SQLite 환경에서 앱의 기반이 되는 데이터베이스 구조를 세팅하고, 초기 온보딩 로직을 구현한다. UI 코드는 건드리지 않는다.

**[상세 구현 사항]**
1. SQLite 스키마 세팅: 기획서를 바탕으로 `workspaces`, `unplugged_times`, `tasks`, `time_blocks` 엔티티를 도출하고, 필요한 컬럼과 외래키(FK)를 스스로 판단하여 테이블을 생성하라.
2. `InitializeWorkspaceUseCase` 구현: 워크스페이스 정보와 다수의 언플러그드 타임 데이터를 트랜잭션으로 안전하게 저장.
3. Tauri Command 노출: `setup_workspace`, `get_current_workspace`

**[테스트 요구사항]**
- 워크스페이스와 1:N 관계인 언플러그드 타임이 트랜잭션 내에서 올바르게 저장되는지 검증하는 단위 테스트(TDD) 작성 필수.

```

#### Sprint 2: 다단계 온보딩 폼 UI (Frontend)

```text
@docs/ai/PLANNING.md 그리고 @docs/ai/DESIGN.md 파일을 참고하여 Sprint 2 (Frontend) 개발을 시작해 줘.

**[목표]**
사용자 온보딩을 위한 다단계(Multi-step) UI를 React로 구현하고 백엔드와 연동한다.

**[상세 구현 사항]**
1. `framer-motion`을 사용하여 자연스럽게 슬라이드되는 Step UI 구현.
2. React Hook Form과 Zod를 활용하여 폼 상태 및 유효성 검사.
3. Step 1 (닉네임) -> Step 2 (워크스페이스명) -> Step 3 (코어 타임, 동적 언플러그드 타임 리스트 추가, 직무 소개) -> Step 4 (AI API Key).
4. `[완료]` 시 `setup_workspace` 커맨드 호출 후 메인 화면으로 라우팅.

```

#### Sprint 3: 언플러그드 타임 회피 스케줄링 엔진 (Backend)

```text
@docs/ai/PLANNING.md 파일을 참고하여 Sprint 3 (Backend) 개발을 시작해 줘.

**[목표]**
태스크를 등록했을 때 빈 시간을 찾아 할당하는 핵심 알고리즘(`AutoScheduleUseCase`)을 구현한다.

**[상세 구현 사항]**
1. `AutoScheduleUseCase` 로직 구현:
   - 타임라인의 빈 공간을 탐색하여 태스크 할당.
   - 할당하려는 시간에 해당 워크스페이스의 `unplugged_times`가 존재한다면, 알아서 해당 구간을 빗겨가도록 `time_blocks`를 분할(Split)하여 배치.
2. 시스템 시간과 현재 상태를 기반으로 인사말을 반환하는 `GreetingUseCase` 구현.
3. Tauri Command 노출: `add_task`, `get_timeline`, `get_greeting`

**[테스트 요구사항]**
- 언플러그드 타임(예: 점심시간)이 중간에 겹쳤을 때 블록이 두 개로 정확히 나뉘어 스케줄링되는지 검증하는 단위 테스트 작성 필수.

```

#### Sprint 4: 메인 워크스페이스 및 쾌속 입력 UI (Frontend)

```text
@docs/ai/PLANNING.md 그리고 @docs/ai/DESIGN.md 파일을 참고하여 Sprint 4 (Frontend) 개발을 시작해 줘.

**[목표]**
시간대별 지능형 인사말, 타임라인 보드, 그리고 쾌속 업무 입력창을 구현한다.

**[상세 구현 사항]**
0. 처음 세팅 화면에서 모든 설정이 끝나면 메인 페이지로 이동한다.
1. 상단 Header: 실시간 시계 컴포넌트, `get_greeting` 기반 지능형 인사말 렌더링.
2. Low-Friction Input 폼: 
   - [태스크명] + [시간(0~23)] / [분(0~59)] Number Input.
   - 마크다운 플레이스홀더가 적용된 확장형 [업무 계획 메모] 영역 구현.
   - [🔥 긴급 업무] 체크박스 포함.
3. 타임라인 보드:
   - 상태별(Done, Now, Will, Blocked) 시각화 렌더링.
   - 예정된 태스크(`Will`) 간의 드래그 앤 드롭 순서 변경 기능 적용.

```

#### Sprint 5: 타임 시프트(인터럽트) 및 종료 분기 처리 (Backend)

```text
/ulw @docs/ai/PLANNING.md 파일과 아래 내용을 참고해서 구체적인 계획을 세운 뒤, Sprint 5 (Backend) 개발을 시작해 줘.

**[목표]**
긴급 업무 시 일정을 미루는 로직과, 태스크 종료 시점의 분기 처리 로직을 구현한다.

**[상세 구현 사항]**
1. `TimeShiftUseCase` 구현:
   - 현재 블록 분할 -> 긴급 업무 삽입 -> 이후 모든 블록의 시간 밀어내기(+연산). SQLite 트랜잭션 활용.
2. `TaskTransitionUseCase` 구현:
   - 시간 연장(15/30분), 제시간 완료, 초과 완료 분기 처리. 완료 시 `review_memo` 저장.
3. Tauri Command 노출: `insert_urgent_task`, `process_task_transition`

**[테스트 요구사항]**
- 긴급 업무 삽입 시 기존 타임블록들이 분(minute) 단위로 정확히 밀려나는지 검증하는 단위 테스트 작성 필수.

```

#### Sprint 6: 태스크 전환 모달 및 오버타임 관리 UI (Frontend)

```text
@docs/ai/PLANNING.md 그리고 @docs/ai/DESIGN.md 파일과 아래 내용을 참고해서 구체적인 계획을 세운 뒤, Sprint 6 (Frontend) 개발을 시작해 줘.

**[목표]**
태스크 종료 시점의 분기 처리 모달과 퇴근 30분 전 오버타임 알럿 모달을 구현한다.

**[상세 구현 사항]**
1. **Task Expiration Modal**: 
   - 예정 시간 종료 시 팝업.
   - [지연 처리]: 15/30분 연장, 정시 완료, 수동 추가 시간 입력.
   - [완료 처리]: 마크다운 지원 업무 후기(Review Memo) 작성 폼.
   - [다음 업무 시작]: 바로 시작, 5/10/15분/수동입력 대기, 미정(타이머 중지) 선택 로직 구현.
2. **Overtime Alert Modal**:
   - 코어 타임 종료 30분 전 조건 체크. 초과 시 경고 모달 노출.
   - 미루기(Inbox 이동) 또는 진행(예상 종료 시간 안내) 처리.

```

#### Sprint 7: AI 회고 로직 (Backend)

```text
@docs/ai/PLANNING.md 파일과 아래 내용을 참고해서 구체적인 계획을 세운 뒤, Sprint 7 (Backend) 개발을 시작해 줘.

**[목표]**
Gemini API를 호출하여 워크스페이스 컨텍스트에 맞는 일일 회고를 생성하는 로직을 구현한다.

**[상세 구현 사항]**
1. `GenerateRetrospectiveUseCase` 구현:
   - 오늘 상태가 DONE인 `time_blocks`를 조회하여 Task 정보, `planning_memo`, `review_memo` 데이터 추출.
   - 워크스페이스의 `role_intro`를 System Prompt에 주입.
   - `reqwest` 클라이언트로 Gemini API 호출 및 마크다운 텍스트 반환.
2. Tauri Command 노출: `generate_retrospective`

**[테스트 요구사항]**
- HTTP Client 모킹(Mocking)을 통해 API 호출 로직이 정상 동작하는지 검증하는 단위 테스트 작성.

```

#### Sprint 8: 사이드바, 인박스 및 AI 회고 모달 (Frontend)

```text
@docs/ai/PLANNING.md 그리고 @docs/ai/DESIGN.md 파일과 아래 내용을 참고해서 구체적인 계획을 세운 뒤, Sprint 8 (Frontend) 개발을 시작해 줘.

**[목표]**
좌측 사이드바와 마크다운 뷰어가 포함된 AI 회고 모달을 완성한다.

**[상세 구현 사항]**
1. 사이드바 UI: 햄버거 버튼 토글, 워크스페이스 스위처 표시.
2. 사이드바 중앙 (Inbox): 대기 큐 태스크 리스트. 타임라인으로 Drag & Drop 연결.
3. AI 회고 기능: 
   - 완료 태스크 1개 이상 시 메인 헤더의 `[✨ 일일 회고]` 활성화.
   - 클릭 시 `react-markdown`을 활용하여 백엔드에서 받은 AI 응답을 렌더링하는 다이얼로그 모달 구현.

```