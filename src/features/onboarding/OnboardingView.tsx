import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/types";
import { useOnboarding } from "./hooks/useOnboarding";
import { Step1Nickname } from "./components/Step1Nickname";
import { Step2Time } from "./components/Step2Time";
import { Step3ApiKey } from "./components/Step3ApiKey";
import { Step4Notification } from "./components/Step4Notification";
import { OnboardingNavigation } from "./components/OnboardingNavigation";
import { StepIndicator } from "./components/StepIndicator";

interface OnboardingViewProps {
  t: any;
  onComplete: (user: User) => void;
}

export const OnboardingView = ({ t, onComplete }: OnboardingViewProps) => {
  const {
    currentStep,
    verificationStatus,
    setVerificationStatus,
    userForm,
    nickname,
    apiKey,
    isFreeUser,
    isNotificationEnabled,
    errors,
    handleNotificationToggle,
    handleStep3Click,
    nextStep,
    prevStep,
    handleKeyDown,
    onUserSubmit,
    handleSubmit,
    setValue,
  } = useOnboarding({ t, onComplete });

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-background p-4 antialiased">
      {/* Draggable region for Tauri */}
      <div className="absolute top-0 left-0 w-full h-8 z-40" data-tauri-drag-region />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface-elevated border border-border/50 rounded-[2.5rem] shadow-2xl shadow-black/20 overflow-hidden flex flex-col h-fit relative z-50"
      >
        <form onSubmit={handleSubmit(onUserSubmit)} onKeyDown={handleKeyDown} className="flex-1 flex flex-col">
          <div className="flex-1 p-10 flex flex-col">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <Step1Nickname userForm={userForm} errors={errors} t={t} />
              )}

              {currentStep === 2 && (
                <Step2Time userForm={userForm} nickname={nickname} t={t} />
              )}

              {currentStep === 3 && (
                <Step3ApiKey 
                  userForm={userForm} 
                  verificationStatus={verificationStatus}
                  setVerificationStatus={setVerificationStatus}
                  isFreeUser={isFreeUser}
                  setValue={setValue}
                  t={t} 
                />
              )}

              {currentStep === 4 && (
                <Step4Notification 
                  isNotificationEnabled={isNotificationEnabled}
                  handleNotificationToggle={handleNotificationToggle}
                  t={t} 
                />
              )}
            </AnimatePresence>
          </div>

          <div className="p-10 pt-0 shrink-0">
            <OnboardingNavigation 
              currentStep={currentStep}
              prevStep={prevStep}
              nextStep={nextStep}
              handleStep3Click={handleStep3Click}
              verificationStatus={verificationStatus}
              apiKey={apiKey}
              nickname={nickname}
              t={t}
            />
            <StepIndicator currentStep={currentStep} />
          </div>
        </form>
      </motion.div>
    </div>
  );
};
