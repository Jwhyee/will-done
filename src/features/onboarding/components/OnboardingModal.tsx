import { useState } from "react";
import { useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { invoke } from "../../../lib/tauri";
import { onboardingSchema, OnboardingData } from "../schema";
import { StepLayout } from "./StepLayout";
import { Step1Profile } from "./Step1Profile";
import { Step2Workspace } from "./Step2Workspace";
import { Step3TimeRole } from "./Step3TimeRole";
import { Step4AI } from "./Step4AI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      
      await invoke("setup_workspace", payload);
      
      localStorage.setItem("nickname", data.nickname);
      if (data.apiKey) localStorage.setItem("apiKey", data.apiKey);

      onComplete();
    } catch (e) {
      console.error("Failed to setup workspace:", e);
      alert(t("alerts.setupFailed", { error: String(e) }));
    } finally {
      setIsSubmitting(false);
    }
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
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none focus:outline-none overflow-hidden">
        <Card className="w-full bg-zinc-900/90 backdrop-blur-xl border-zinc-800 shadow-2xl overflow-hidden">
          <CardHeader className="space-y-6 pb-8">
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
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="min-h-[280px] max-h-[60vh] overflow-y-auto px-6 scrollbar-hide">
                <StepLayout direction={direction}>
                  {steps[step]}
                </StepLayout>
                
                {Object.keys(formErrors).length > 0 && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in duration-300">
                    <p className="text-xs text-red-400 font-medium mb-1">
                      입력 내용 중 수정이 필요한 항목이 있습니다.
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between pt-6 pb-8 px-6 bg-zinc-900/50">
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
                    {isSubmitting && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    )}
                    {t("onboarding.complete")}
                  </Button>
                )}
              </CardFooter>
            </form>
          </FormProvider>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
