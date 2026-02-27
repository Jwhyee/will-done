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
    }
  }
};

export type Lang = "ko" | "en";

export const getLang = (): Lang => {
  const locale = navigator.language.toLowerCase();
  return locale.startsWith("ko") ? "ko" : "en";
};
