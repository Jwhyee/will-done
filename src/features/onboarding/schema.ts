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

// Use .default() to make them optional in the input but guaranteed in the output
export const onboardingSchema = z.object({
  nickname: z.string().min(1, koreanMessages.required),
  workspaceName: z.string().min(1, koreanMessages.required).default("My Workspace"),
  coreTimeStart: z.string().optional().nullable(),
  coreTimeEnd: z.string().optional().nullable(),
  roleIntro: z.string().default(""),
  unpluggedTimes: z.array(unpluggedTimeSchema).default([]),
  apiKey: z.string().optional().nullable()
});

// Explicitly define the type to match exactly what's needed
export type OnboardingData = {
  nickname: string;
  workspaceName: string;
  roleIntro: string;
  unpluggedTimes: { label: string; start_time: string; end_time: string; }[];
  coreTimeStart?: string | null;
  coreTimeEnd?: string | null;
  apiKey?: string | null;
};
