export const translations = {
  ko: {
    checking: "프로필 확인 중...",
    welcome: "다시 오신 것을 환영합니다, ",
    ready_msg: "will-done을 사용하여 시간을 관리할 준비가 되었습니다.",
    onboarding: {
      title: "전역 프로필 생성",
      description: "will-done에 오신 것을 환영합니다. 계속하려면 프로필을 설정해주세요.",
      nickname_label: "닉네임 (필수)",
      nickname_placeholder: "당신의 이름을 입력해주세요.",
      nickname_required: "닉네임은 필수입니다.",
      api_key_label: "Google AI Studio API Key (선택)",
      api_key_placeholder: "API 키를 입력해주세요.",
      api_key_guide: "* 이 키는 AI 자동 회고 기능에 사용됩니다. 설정에서 나중에 추가할 수 있습니다.",
      submit_btn: "시작하기",
    },
    workspace_setup: {
      title_first: "첫 워크스페이스 생성",
      title_new: "새 워크스페이스 추가",
      description: "업무 환경을 분리하여 관리할 수 있습니다.",
      name_label: "워크스페이스 이름",
      name_placeholder: "예: 회사, 사이드 프로젝트",
      name_required: "이름을 입력해주세요.",
      core_time: "코어 타임 (선택)",
      core_time_guide: "업무에 집중할 시간(예: 09:00 ~ 18:00)을 입력해주세요.",
      core_time_error: "시작 시간은 종료 시간보다 빨라야 합니다.",
      unplugged_time: "언플러그드 타임",
      unplugged_guide: "점심/저녁 식사 등 고정적으로 업무에 포함되지 않는 시간을 입력해주세요.",
      add_unplugged: "추가",
      unplugged_label_placeholder: "라벨 입력 (예: 점심 시간)",
      label_required: "라벨을 입력해주세요.",
      role_intro: "직무 소개 (AI 컨텍스트)",
      role_placeholder: "본인의 역할과 주요 업무를 설명해주세요. AI가 회고를 작성할 때 참고합니다.",
      submit_btn: "워크스페이스 생성",
    },
    sidebar: {
      inbox: "인박스",
      settings: "설정",
      date_search: "날짜 검색",
      no_tasks: "대기 중인 태스크가 없습니다.",
    }
  },
  en: {
    checking: "Checking profile...",
    welcome: "Welcome back, ",
    ready_msg: "You are ready to manage your time with will-done.",
    onboarding: {
      title: "Create Global Profile",
      description: "Welcome to will-done. Please set up your profile to continue.",
      nickname_label: "Nickname (Required)",
      nickname_placeholder: "How should we call you?",
      nickname_required: "Nickname is required.",
      api_key_label: "Google AI Studio API Key (Optional)",
      api_key_placeholder: "Enter your API key",
      api_key_guide: "* This key is used for AI-generated retrospectives. You can add it later in settings.",
      submit_btn: "Get Started",
    },
    workspace_setup: {
      title_first: "Create Your First Workspace",
      title_new: "Add New Workspace",
      description: "Separate your work environments.",
      name_label: "Workspace Name",
      name_placeholder: "e.g., Company, Side Project",
      name_required: "Name is required.",
      core_time: "Core Time (Optional)",
      core_time_guide: "Please enter the time to focus on work (e.g., 09:00 ~ 18:00).",
      core_time_error: "Start must be before end.",
      unplugged_time: "Unplugged Time",
      unplugged_guide: "Please enter times not included in work (e.g., lunch/dinner).",
      add_unplugged: "Add",
      unplugged_label_placeholder: "Enter label (e.g., Lunch)",
      label_required: "Label is required.",
      role_intro: "Role Introduction (AI Context)",
      role_placeholder: "Describe your role and responsibilities. AI will use this for retrospectives.",
      submit_btn: "Create Workspace",
    },
    sidebar: {
      inbox: "Inbox",
      settings: "Settings",
      date_search: "Search Date",
      no_tasks: "No pending tasks.",
    }
  }
};

export type Lang = "ko" | "en";

export const getLang = (): Lang => {
  const locale = navigator.language.toLowerCase();
  return locale.startsWith("ko") ? "ko" : "en";
};
