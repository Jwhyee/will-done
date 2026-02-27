import { useState } from "react";
import { useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { onboardingSchema, OnboardingData } from "../features/onboarding/schema";
import { StepLayout } from "../features/onboarding/components/StepLayout";
import { Step1Profile } from "../features/onboarding/components/Step1Profile";
import { Step2Workspace } from "../features/onboarding/components/Step2Workspace";
import { Step3TimeRole } from "../features/onboarding/components/Step3TimeRole";
import { Step4AI } from "../features/onboarding/components/Step4AI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const methods = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    mode: "all",
    defaultValues: {
      nickname: "",
      workspaceName: "",
      coreTimeStart: "",
      coreTimeEnd: "",
      roleIntro: "",
      unpluggedTimes: [],
      apiKey: ""
    }
  });
  const { handleSubmit, trigger, formState: { errors: formErrors } } = methods;

  const onSubmit: SubmitHandler<OnboardingData> = async (data) => {
    console.log("Onboarding submission started", data);
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.workspaceName,
        nickname: data.nickname,
        core_time_start: data.coreTimeStart || null,
        core_time_end: data.coreTimeEnd || null,
        role_intro: data.roleIntro || "",
        unplugged_times: data.unpluggedTimes.map(ut => ({
          label: ut.label,
          start_time: ut.start_time,
          end_time: ut.end_time
        })),
      };
      
      console.log("Invoking setup_workspace with payload:", payload);
      const workspaceId = await invoke("setup_workspace", payload);
      console.log("Workspace setup successful, ID:", workspaceId);
      
      localStorage.setItem("nickname", data.nickname);
      if (data.apiKey) localStorage.setItem("apiKey", data.apiKey);

      // Final confirmation
      console.log("Navigating to Home...");
      navigate("/home"); 
    } catch (e) {
      console.error("Failed to setup workspace:", e);
      alert(t("alerts.setupFailed", { error: String(e) }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form validation failed:", errors);
    // If there are errors in previous steps, we might want to go back to that step
    // but for now, let's just log them.
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof OnboardingData)[] = [];
    if (step === 0) fieldsToValidate = ["nickname"];
    if (step === 1) fieldsToValidate = ["workspaceName"];
    if (step === 2) fieldsToValidate = ["coreTimeStart", "coreTimeEnd", "roleIntro", "unpluggedTimes"];
    if (step === 3) fieldsToValidate = ["apiKey"];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      console.log("Validation failed for step", step, methods.formState.errors);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const steps = [
    <Step1Profile />,
    <Step2Workspace />,
    <Step3TimeRole />,
    <Step4AI />
  ];

  const stepTitles = [
    t("steps.profile.title"),
    t("steps.workspace.title"),
    t("steps.timeRole.title"),
    t("steps.ai.title")
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-2xl">
        <CardHeader className="space-y-6 pb-8">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2">
            {stepTitles.map((_, index) => (
              <div key={index} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300
                  ${index < step 
                    ? "bg-indigo-500 text-white" 
                    : index === step 
                      ? "bg-indigo-500/20 border-2 border-indigo-500 text-indigo-400"
                      : "bg-zinc-800 text-zinc-500"
                  }
                `}>
                  {index < step ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                {index < stepTitles.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 transition-colors duration-300 ${index < step ? "bg-indigo-500" : "bg-zinc-800"}`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-zinc-100">
              {stepTitles[step]}
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              {t("onboarding.step", { current: step + 1, total: 4 })}
            </CardDescription>
          </div>
        </CardHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <CardContent className="min-h-[280px]">
            <StepLayout direction={direction}>
              {steps[step]}
            </StepLayout>
            
            {/* Global validation error summary for debugging/visibility */}
            {Object.keys(formErrors).length > 0 && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in duration-300">
                <p className="text-xs text-red-400 font-medium mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  입력 내용 중 수정이 필요한 항목이 있습니다:
                </p>
                <ul className="list-disc list-inside text-[10px] text-red-400/80">
                  {Object.entries(formErrors).map(([key, value]: [string, any]) => {
                    if (key === "unpluggedTimes" && Array.isArray(value)) return null; // Already handled in Step3
                    return (
                      <li key={key}>
                        {key === "nickname" ? "닉네임" : 
                         key === "workspaceName" ? "워크스페이스 이름" : 
                         key === "coreTimeEnd" ? "시간 설정" : key}: {value.message}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between pt-4">
            {step > 0 && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={prevStep}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                {t("onboarding.back")}
              </Button>
            )}
            {step === 0 && <div />}
            
            {step < 3 ? (
              <Button 
                type="button" 
                onClick={nextStep}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8"
              >
                {t("onboarding.next")}
              </Button>
            ) : (
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 shadow-lg shadow-indigo-500/25"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : null}
                {t("onboarding.complete")}
              </Button>
            )}
          </CardFooter>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}
