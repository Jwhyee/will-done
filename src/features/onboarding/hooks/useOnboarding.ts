import { useState, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { User } from "@/types";
import { useToast } from "@/providers/ToastProvider";
import { onboardingApi } from "../api";

interface UseOnboardingProps {
  t: any;
  onComplete: (user: User) => void;
}

export const useOnboarding = ({ t, onComplete }: UseOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { showToast } = useToast();

  const userSchema = z.object({
    nickname: z.string().min(1, t.onboarding.nickname_required).max(20),
    geminiApiKey: z.string(),
    isNotificationEnabled: z.boolean(),
    isFreeUser: z.boolean(),
    dayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required"),
  });

  type UserFormValues = z.infer<typeof userSchema>;

  const userForm = useForm<UserFormValues>({ 
    resolver: zodResolver(userSchema),
    defaultValues: { 
      nickname: "", 
      geminiApiKey: "", 
      isNotificationEnabled: false, 
      isFreeUser: true,
      dayStartTime: "04:00" 
    }
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = userForm;
  const nickname = watch("nickname");
  const apiKey = watch("geminiApiKey");
  const isFreeUser = watch("isFreeUser");
  const isNotificationEnabled = watch("isNotificationEnabled");

  const onUserSubmit = async (data: UserFormValues) => {
    await onboardingApi.saveUser({ 
      nickname: data.nickname, 
      geminiApiKey: data.geminiApiKey || null,
      lang: "ko", // hardcoded for now or get from context
      isFreeUser: data.isFreeUser,
      isNotificationEnabled: data.isNotificationEnabled,
      dayStartTime: data.dayStartTime,
    });
    // Still need to get_user, I'll add it to onboardingApi or use direct invoke if it's general
    // Actually, get_user is used in many places, maybe it should be in a global user api.
    // For now, I'll use a direct invoke or add it to onboardingApi.
    // Let's check where get_user is used.
    const u = await onboardingApi.getUser();
    if (u) onComplete(u);
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      let permission = await isPermissionGranted();
      if (!permission) {
        permission = await requestPermission() === "granted";
      }
      setValue("isNotificationEnabled", permission);
    } else {
      setValue("isNotificationEnabled", false);
    }
  };

  const handleVerifyApiKey = async () => {
    const currentApiKey = watch("geminiApiKey");
    if (!currentApiKey) {
      nextStep();
      return;
    }
    
    setVerificationStatus('loading');
    try {
      await onboardingApi.verifyApiKey(currentApiKey);
      setVerificationStatus('success');
      showToast(t.onboarding.api_key_valid, "success");
    } catch (error) {
      console.error(error);
      setVerificationStatus('error');
    }
  };

  const handleStep3Click = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!apiKey || verificationStatus === 'success') {
      nextStep(e);
    } else {
      handleVerifyApiKey();
    }
  };

  const nextStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (currentStep < 4) setCurrentStep(prev => prev + 1);
  };

  const prevStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentStep === 1 && nickname) {
        nextStep();
      } else if (currentStep === 2) {
        nextStep();
      } else if (currentStep === 3) {
        handleStep3Click();
      } else if (currentStep === 4) {
        handleSubmit(onUserSubmit)();
      }
    }
  };

  return {
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
    handleVerifyApiKey,
    handleStep3Click,
    nextStep,
    prevStep,
    handleKeyDown,
    onUserSubmit,
    handleSubmit,
    setValue,
  };
};
