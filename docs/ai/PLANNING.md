# 🚀 제품 요구사항 정의서 (PRD): will-done

## 1. 프로젝트 개요 (Project Overview)
**will-done**은 잦은 업무 중단(Interruptions)을 유연하게 관리하고, '워크스페이스'를 통해 업무 컨텍스트를 분리하며, 누적된 업무 데이터를 바탕으로 고품질의 AI 성과 리뷰(Brag Documents)를 자동 생성하는 크로스 플랫폼 데스크톱 애플리케이션입니다.

* **Target OS**: Windows, macOS (Tauri 기반 데스크톱 앱)
* **UI/UX 기조**: 완전한 다크 모드(Strictly Dark Mode), 듀얼 사이드바 레이아웃, 정보 밀집형 모던 데스크톱 미학
* **개발 스택**: 프론트엔드(React, TypeScript, Tailwind CSS, shadcn/ui), 백엔드(Rust, Tauri v2, SQLite)

---

## 2. 핵심 용어 정의 (Glossary)
* **User**: 앱의 주체. `닉네임`, `Gemini API Key`, `언어 설정(KR/EN)`, `하루 시작 시간(day_start_time)`을 보유.
* **Workspace**: 사용자가 정의하는 업무 환경 프로필. 본업, 사이드 프로젝트 등 컨텍스트를 격리하며, 개별적인 `Core Time`과 AI 프롬프트를 위한 `Role Intro`를 가짐.
* **Unplugged Time**: 식사, 정기 회의 등 스케줄러가 태스크 배정 시 자동으로 건너뛰는 고정된 반복 휴식/차단 시간.
* **Logical Date (논리적 날짜)**: 자정(00:00)이 아닌 사용자가 설정한 `하루 시작 시간(기본값 04:00)`을 기준으로 계산되는 업무 기준일. 밤샘 작업 시에도 흐름이 끊기지 않도록 보장함.
* **Task**: 사용자가 최초로 등록하는 업무의 원본 정의 (`Title`, `Planning Memo`, `Estimated Minutes`).
* **TimeBlock**: 타임라인 상에 렌더링되는 실제 시간 조각. 긴급 업무나 Unplugged Time에 의해 하나의 Task가 여러 개의 TimeBlock으로 분할될 수 있음.
    * **상태값**: `WILL`(예정), `NOW`(진행 중), `DONE`(완료), `PENDING`(긴급 업무로 인한 중단), `UNPLUGGED`(차단됨).

---

## 3. 핵심 기능 요구사항 (Functional Requirements)

### 3.1. 지능형 스케줄링 및 타임라인 엔진 (Timeline Engine)
* **논리적 날짜(Logical Date) 기반 렌더링**
    * 타임라인은 사용자가 설정한 `day_start_time`을 기준으로 하루를 정의함. (예: 04:00 설정 시, 오늘 04:00 ~ 내일 03:59가 하나의 타임라인).
    * 헤더에는 실시간 시계와 함께 현재 시간에 해당하는 '논리적 날짜'가 표시되어야 함.
* **스마트 라우팅 (마감 초과 방어 로직)**
    * 사용자가 신규 업무를 등록할 때, 예상 종료 시간이 설정된 '논리적 하루 마감 시간'을 초과할 경우 즉시 등록을 차단하고 **컨펌 다이얼로그**를 노출함.
    * *예(Continue)* 선택 시 타임라인에 배정하며, *아니오(To Inbox)* 선택 시 타임라인에 넣지 않고 인박스(Inbox)로 보관함.
* **타임 시프트 (Time Shift) 및 긴급 업무 삽입**
    * `🔥 Urgent(긴급)` 속성으로 업무 추가 시, 현재 진행 중인(`NOW`) 블록을 즉시 `PENDING` 처리함.
    * 긴급 업무를 현재 시간에 삽입하고, 중단된 업무의 남은 시간과 이후의 모든 `WILL` 블록들을 긴급 업무의 소요 시간만큼 정확히 뒤로 미룸(Shift).
* **Unplugged Time 회피 (Auto-Split)**
    * 태스크 배정 시 설정된 Unplugged Time과 겹칠 경우, 해당 시간을 건너뛰고 태스크를 자동으로 2개 이상의 블록으로 분할(Split)하여 배정함.

### 3.2. 업무 상태 전환 및 인터랙션 (Task Transitions)
* **자동 상태 전환 (Auto-Transition)**
    * 1초 주기 타이머를 통해 현재 시간이 다음 `WILL` 블록의 시작 시간을 지나면 자동으로 `NOW` 상태로 전환함.
    * `NOW` 블록의 마감 시간이 초과되면 네이티브 OS 알림을 발송하고 타임라인 뱃지 및 애니메이션(Breathing)으로 시각적 경고를 제공함.
* **태스크 종료 분기 모달 (Transition Modal)**
    * 탭(Tab) 기반 UI 적용: 사용자의 의도에 따라 **[완료 처리]**와 **[연장 처리]** 탭으로 분리하여 인지 부하 최소화.
    * **점진적 공개(Progressive Disclosure)**: 완료 시점 선택 시 '직접 입력'을 선택했을 때만 N시간 M분 전 입력 폼이 애니메이션과 함께 노출됨.
    * 완료 처리 시 작성한 회고 메모는 개별 조각(Block)이 아닌 원본 업무(Task)에 논리적으로 귀속됨. (분할된 블록의 마지막 조각 완료 시 전체 과거 조각 동기화)

### 3.3. AI 기반 다중 주기 회고 생성 (AI Retrospective)
* **기간별 맞춤 생성**
    * 일간(Daily), 주간(Weekly), 월간(Monthly) 단위의 회고 생성을 지원함.
    * `activeDates`를 쿼리하여 실제 태스크 기록이 있는 날짜/기간만 선택할 수 있도록 방어 로직 구현.
* **멀티 모델 폴백 엔진 (Multi-Model Fallback Engine)**
    * Gemini API 호출 시 Quota Exceeded(429) 또는 서버 에러(503) 발생을 대비함.
    * 로컬 DB에 성공 이력이 있는 캐시 모델을 우선 시도한 후, 실패 시 `flash-lite` -> `flash` -> `pro` 순으로 자동 재시도 체인을 가동하여 안정성을 보장함.
* **데이터 정합성 및 포맷팅**
    * 중복 생성 방지를 위해 생성 전 DB를 쿼리함.
    * 사용자의 `Role Intro`와 완료된 태스크의 `Planning Memo`, `Review Memo`를 컨텍스트로 결합하여 지정된 언어(KR/EN)로 Markdown 보고서를 생성함.

---

## 4. UI/UX 및 디자인 요구사항

### 4.1. 듀얼 사이드바 시스템
* **Primary Sidebar (L1)**: 좌측 끝단. 좁은 너비(w-14)로 워크스페이스 간의 빠른 전환(Context Switching) 아이콘 노출.
* **Secondary Sidebar (L2)**: 접기/펼치기(Collapse) 지원. 인박스 큐, 설정, 회고 브라우저 접근 기능 제공.

### 4.2. 타임라인 및 태스크 카드 (Timeline & Sortable Item)
* **가독성 확보 (렌더링 버그 수정 반영)**
    * 시간 레이블(`19:30`)은 타임라인 인디케이터(Dot)의 완전한 좌측(`side-by-side`)에 배치하여 수직 실선(Solid Line)과 겹치지 않도록 함.
    * 긴급 업무 등으로 조각난(Split) 태스크 블록들은 테두리 누락 없이 완전한 사각형 4면 실선(Solid border)을 유지함. 투명도(Opacity)를 조절하여 상태(DONE, UNPLUGGED 등)를 시각적으로 구분함.
* **시각적 피드백**
    * 마감 초과 태스크: 붉은색 글로우의 부드러운 애니메이션(`animate-breathing`, 2.8s) 적용.
    * 상호작용: 태스크 카드 호버 시 `surface-elevated` 스케일 업 애니메이션 및 액션 버튼(수정, 삭제 등) 노출.
* **드래그 앤 드롭 (Dnd)**
    * 인박스와 타임라인 간의 양방향 드래그 및 타임라인 내부 순서 변경 지원 (`dnd-kit` 활용). 변경 시 전체 시간 자동 재계산.

---

## 5. 데이터베이스 스키마 (SQLite)

프라이버시와 오프라인 동작을 보장하기 위해 모든 데이터는 로컬 환경에 저장됨.

* `users`: `id`, `nickname`, `gemini_api_key`, `lang`, `day_start_time`(논리적 날짜 기준점)
* `workspaces`: `id`, `name`, `core_time_start`, `core_time_end`, `role_intro`
* `unplugged_times`: `id`, `workspace_id`, `label`, `start_time`, `end_time`
* `tasks`: `id`, `workspace_id`, `title`, `planning_memo`, `estimated_minutes`
* `time_blocks`: `id`, `task_id`, `workspace_id`, `title`, `start_time`, `end_time`, `status`, `review_memo`, `is_urgent`
* `retrospectives`: `id`, `workspace_id`, `retro_type`, `content`, `date_label`, `used_model`(생성에 성공한 AI 모델명), `created_at`

---

## 6. 향후 개발 계획 (Future Sprints)
* **Statistics View**: 카테고리/워크스페이스별 소요 시간 통계 시각화.
* **Pomodoro Integration**: 뽀모도로 타이머 로직 통합 및 휴식 리마인더 알림음 지원.
* **Cloud Sync/Export**: 외부 백업을 위한 JSON/CSV 데이터 추출 및 클라우드 동기화 모듈 개발.