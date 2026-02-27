### 🏃 will-done MVP Development Sprints (AI Prompt Guide)

#### Sprint 1: 전역 유저 설정 및 초기화 (Backend)

```text
Sprint 1 (Backend) 개발을 시작해 줘.

**[목표]**
SQLite 환경에서 전역 사용자 정보를 관리하는 테이블을 생성하고 로직을 구현한다. UI는 건드리지 않는다.

**[엔티티 생성 지침]**
- `users` 테이블 생성: `id` (PK, 항상 1로 유지), `nickname` (TEXT), `gemini_api_key` (TEXT, Null 허용).

**[상세 구현 사항]**
1. 로컬 DB 초기화 및 `users` 테이블 마이그레이션 적용.
2. 유저 정보 조회 및 저장/업데이트를 위한 Tauri Command 노출: `get_user`, `save_user`.
3. 유저 등록 여부를 판별하는 간단한 `CheckUserExistsUseCase` 구현.

```

#### Sprint 2: 진입 모달 및 초기 라우팅 UI (Frontend)

```text
Sprint 2 (Frontend) 개발을 시작해 줘.

**[목표]**
앱 진입 시 유저 정보 유무에 따라 모달을 띄우거나 통과시키는 라우팅 UI를 구현한다.

**[상세 구현 사항]**
1. 앱 진입 시 `get_user` 커맨드 호출.
2. 유저 정보가 없다면 전면 모달 오픈: 
   - [사용자 이름] (필수 입력)
   - [Google AI Studio API Key] (선택 입력, "추후 AI 자동 회고 기능에 사용됩니다" 안내 문구 포함)
3. 폼 제출 시 `save_user` 호출 후 메인 화면으로 이동.

```

#### Sprint 3: 워크스페이스 엔티티 및 저장 로직 (Backend)

```text
Sprint 3 (Backend) 개발을 시작해 줘.

**[목표]**
워크스페이스와 언플러그드 타임을 관리하는 데이터베이스 구조와 저장 로직을 구현한다.

**[엔티티 생성 지침]**
- `workspaces` 테이블 생성: `id`, `name`, `core_time_start`, `core_time_end`, `role_intro`.
- `unplugged_times` 테이블 생성: `id`, `workspace_id` (FK), `label`, `start_time`, `end_time`. (1:N 관계로 구현).

**[상세 구현 사항]**
1. `CreateWorkspaceUseCase` 구현: 워크스페이스 정보와 다수의 언플러그드 타임 데이터를 단일 트랜잭션으로 저장.
2. Tauri Command 노출: `create_workspace`, `get_workspaces`.

```

#### Sprint 4: 워크스페이스 생성 및 듀얼 사이드바 UI (Frontend)

```text
Sprint 4 (Frontend) 개발을 시작해 줘.

**[목표]**
워크스페이스 생성 UI와 Slack 형태의 듀얼 사이드바 레이아웃 뼈대를 구현한다.

**[상세 구현 사항]**
1. 워크스페이스 생성 폼 UI:
   - 코어 타임: "업무에 집중할 시간을 입력해주세요." 안내 문구.
   - 언플러그드 타임 (다중 입력): "점심/저녁 식사 등 고정적으로 업무에 포함되지 않는 시간을 입력해주세요." 안내 문구.
2. 듀얼 사이드바 레이아웃 구현:
   - 1차 사이드바 (좌측 좁은 영역): 워크스페이스 스위처 아이콘 목록.
   - 2차 사이드바 (좌측 넓은 영역): 상단 날짜 검색, 중앙 Inbox 큐, 하단 설정 버튼.

```

#### Sprint 5: 스케줄링 엔진 및 태스크 엔티티 (Backend)

```text
Sprint 5 (Backend) 개발을 시작해 줘.

**[목표]**
태스크 관리를 위한 테이블을 생성하고, 언플러그드 타임을 회피하는 스케줄링 엔진을 구현한다.

**[엔티티 생성 지침]**
- `tasks` 테이블 생성: `id`, `workspace_id`, `title`, `planning_memo`.
- `time_blocks` 테이블 생성: `id`, `task_id`, `start_time`, `end_time`, `status`, `review_memo`.

**[상세 구현 사항]**
1. `AutoScheduleUseCase` 로직 구현: 타임라인 배치 시 `unplugged_times`와 겹치면 `time_blocks`를 분할(Split)하여 배치.
2. 지능형 인사말 로직(`GreetingUseCase`) 구현.
3. Tauri Command 노출: `add_task`, `get_timeline`, `get_greeting`.

**[테스트 요구사항]**
- 언플러그드 타임 구간에 스케줄이 배정될 때 블록이 정확히 쪼개지는지 단위 테스트로 검증할 것.

```

#### Sprint 6: 메인 타임라인 및 쾌속 입력 UI (Frontend)

```text
Sprint 6 (Frontend) 개발을 시작해 줘.

**[목표]**
우측 메인 영역의 타임라인 보드와 업무 입력창을 구현한다.

**[상세 구현 사항]**
1. 상단 Header: 실시간 시계, `get_greeting` 기반 텍스트.
2. 쾌속 입력 폼: [태스크명] + [시간/분] + [마크다운 계획 메모] + [🔥 긴급 업무 체크박스].
3. 타임라인 보드: 상태별 시각화 및 예정된 태스크(`Will`) 간 드래그 앤 드롭 순서 변경 구현.

```

#### Sprint 7: 타임 시프트 및 종료 분기 (Backend)

```text
Sprint 7 (Backend) 개발을 시작해 줘.

**[목표]**
긴급 업무 시 일정을 미루는 로직과 태스크 종료 시 상태 업데이트 로직을 구현한다.

**[상세 구현 사항]**
1. `TimeShiftUseCase`: 현재 블록 분할 -> 긴급 업무 삽입 -> 이후 모든 블록 시간 밀어내기.
2. `TaskTransitionUseCase`: 연장(15/30분), 정시 완료, 수동 추가 시간 분기 처리 및 `review_memo` 업데이트.
3. Tauri Command 노출: `insert_urgent_task`, `process_task_transition`.

```

#### Sprint 8: 전환 모달 및 오버타임 알럿 (Frontend)

```text
Sprint 8 (Frontend) 개발을 시작해 줘.

**[목표]**
태스크 종료 시점의 분기 처리 모달과 퇴근 전 오버타임 알럿 UI를 구현한다.

**[상세 구현 사항]**
1. **Task Expiration Modal**: 예정 시간 종료 시 노출. 지연/완료 처리 분기 및 다음 업무 시작 옵션 제공.
2. **Overtime Alert Modal**: 코어 타임 종료 30분 전 조건 체크 및 경고 노출.

```

#### Sprint 9: AI 회고 로직 (Backend)

```text
Sprint 9 (Backend) 개발을 시작해 줘.

**[목표]**
Gemini API를 호출하여 AI 회고 텍스트를 생성하는 로직을 구현한다.

**[상세 구현 사항]**
1. `users` 테이블의 API Key와 `workspaces`의 `role_intro` 활용.
2. `GenerateRetrospectiveUseCase` 구현: 완료된 태스크 데이터와 직무 소개를 조합하여 API 호출 및 마크다운 결과 반환.
3. Tauri Command 노출: `generate_retrospective`.

```

#### Sprint 10: 2차 사이드바 및 AI 회고 모달 (Frontend)

```text
Sprint 10 (Frontend) 개발을 시작해 줘.

**[목표]**
2차 사이드바의 Inbox 기능과 AI 회고 모달을 완성한다.

**[상세 구현 사항]**
1. 2차 사이드바 Inbox: 대기 큐 태스크 리스트 렌더링 및 타임라인 Drag & Drop 연결.
2. 2차 사이드바 상단: 날짜 선택 시 해당 날짜 업무 요약 모달 노출.
3. AI 회고 모달: `react-markdown`을 활용한 결과 렌더링.

```