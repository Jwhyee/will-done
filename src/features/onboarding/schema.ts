import { z } from "zod";

const koreanMessages = {
  required: "필수 입력 항목입니다",
  invalidTime: "잘못된 시간 형식입니다",
  endTimeAfterStart: "종료 시간은 시작 시간 이후여야 합니다",
  bothTimesRequired: "시작과 종료 시간을 모두 입력해야 합니다"
};

export const unpluggedTimeSchema = z.object({
  label: z.string().min(1, koreanMessages.required),
  start_time: z.string().min(1, koreanMessages.required),
  end_time: z.string().min(1, koreanMessages.required),
}).refine(data => data.start_time < data.end_time, {
  message: koreanMessages.endTimeAfterStart,
  path: ["end_time"]
});

export const onboardingSchema = z.object({
  nickname: z.string().min(1, koreanMessages.required),
  workspaceName: z.string().min(1, koreanMessages.required),
  coreTimeStart: z.string().optional().nullable(),
  coreTimeEnd: z.string().optional().nullable(),
  roleIntro: z.string(),
  unpluggedTimes: z.array(unpluggedTimeSchema),
  apiKey: z.string().optional().nullable()
});

export type OnboardingData = z.infer<typeof onboardingSchema>;
