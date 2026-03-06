# Execution Plan: Task Title Input Visual Improvement

Objective: `TaskForm`이 확장되었을 때 태스크 제목 입력창(Title Input)의 시인성을 높이기 위해 테두리(border) 색상을 강조하고, 축소 시에는 원래의 스타일로 복구한다.

## 1. Research & Analysis
- [x] `src/features/workspace/components/TaskForm.tsx`에서 태스크 제목 입력창을 감싸는 컨테이너와 `Input` 컴포넌트의 현재 스타일을 분석한다.
- [x] 확장 상태(`isExpanded === true`)에서 적용할 수 있는 적절한 강조 색상(예: `border-text-primary`, `border-black`, `ring` 등)을 결정한다.

## 2. Frontend (UI Implementation)
- [x] **확장 상태의 제목 입력창 스타일링**:
    - `isExpanded`가 `true`일 때 제목 입력창 컨테이너에 명확한 테두리 색상(예: `border-text-primary` 또는 다크 모드 고려 시 적절한 강조색)을 적용한다.
    - 입력창 내부 배경색을 조정하여 다른 입력 요소들과 시각적으로 구분되도록 한다.
- [x] **축소 상태의 스타일 복구**:
    - `isExpanded`가 `false`일 때는 현재의 깔끔한 스타일로 유지되도록 조건부 클래스(`cn`)를 정교하게 조정한다.

## 3. Validation & Testing
- [x] **시각적 검증**: 폼이 확장되었을 때 제목 입력창이 다른 요소들(메모, 시간 설정 등)과 명확히 구분되는지 확인한다.
- [x] **동작 검증**: 폼이 다시 축소되었을 때 테두리 색상이 원래대로(투명하거나 기본 border 색상으로) 돌아오는지 확인한다.
- [x] **기존 테스트 확인**: `src/features/workspace/components/TaskForm.test.tsx`를 실행하여 UI 변경이 기존 기능에 영향을 주지 않는지 확인한다.
