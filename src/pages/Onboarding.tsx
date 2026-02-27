import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { onboardingSchema, OnboardingData } from "../features/onboarding/schema";
import { StepLayout } from "../features/onboarding/components/StepLayout";
import { Step1Profile } from "../features/onboarding/components/Step1Profile";
import { Step2Workspace } from "../features/onboarding/components/Step2Workspace";
import { Step3TimeRole } from "../features/onboarding/components/Step3TimeRole";
import { Step4AI } from "../features/onboarding/components/Step4AI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();

  const { register, handleSubmit, control, formState: { errors }, trigger } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
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

  const onSubmit: SubmitHandler<OnboardingData> = async (data) => {
    try {
      const payload = {
        name: data.workspaceName,
        core_time_start: data.coreTimeStart || null,
        core_time_end: data.coreTimeEnd || null,
        role_intro: data.roleIntro,
        unplugged_times: data.unpluggedTimes
      };

      await invoke("setup_workspace", payload);

      localStorage.setItem("nickname", data.nickname);
      if (data.apiKey) localStorage.setItem("apiKey", data.apiKey);

      navigate("/home");
    } catch (e) {
      console.error("Onboarding failed:", e);
      alert("Failed to setup workspace: " + e);
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
    <Step1Profile register={register} errors={errors} />,
    <Step2Workspace register={register} errors={errors} />,
    <Step3TimeRole register={register} control={control} />,
    <Step4AI register={register} />
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Step {step + 1} of 4</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent>
            <StepLayout direction={direction}>
              {steps[step]}
            </StepLayout>
          </CardContent>
          <CardFooter className="flex justify-between">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={prevStep}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button type="submit">Complete</Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
