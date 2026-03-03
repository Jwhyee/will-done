import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TimeBlock, User } from "@/types";
import { useToast } from "@/providers/ToastProvider";

interface UseWorkspaceProps {
  t: any;
  user: User | null;
  currentTime: Date;
  timeline: TimeBlock[];
  onTaskSubmit: (data: any) => Promise<void>;
  onEditTaskSubmit: (blockId: number, data: any) => Promise<void>;
}

export const useWorkspace = ({
  t,
  user,
  currentTime,
  timeline,
  onTaskSubmit,
  onEditTaskSubmit,
}: UseWorkspaceProps) => {
  const [hoverTaskId, setHoverTaskId] = useState<number | null>(null);
  const [deleteTaskProps, setDeleteTaskProps] = useState<{ id: number; title: string; status: string } | null>(null);
  const [isSplitDelete, setIsSplitDelete] = useState(false);
  const [moveAllConfirm, setMoveAllConfirm] = useState(false);
  const [exceededConfirm, setExceededConfirm] = useState<{ data: any } | null>(null);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [editTaskBlock, setEditTaskBlock] = useState<TimeBlock | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Auto-focus the current task (NOW) on mount
    const nowBlock = timeline.find((b) => b.status === "NOW");
    if (nowBlock) {
      setTimeout(() => {
        const element = document.getElementById(`block-${nowBlock.id}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [timeline.length > 0]);

  const taskSchema = z
    .object({
      title: z.string().min(1, "Task title is required"),
      hours: z.number().min(0).max(23),
      minutes: z.number().min(0).max(59),
      planningMemo: z.string().optional(),
      isUrgent: z.boolean(),
    })
    .refine((data) => data.hours > 0 || data.minutes > 0, {
      message: "Duration must be at least 1 minute",
      path: ["minutes"],
    });

  type TaskFormValues = z.infer<typeof taskSchema>;

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", hours: 0, minutes: 30, planningMemo: "", isUrgent: false },
  });

  const handleTaskSubmit = async (data: TaskFormValues) => {
    if (!user) return;

    const duration = data.hours * 60 + data.minutes;
    let startTime = currentTime;

    if (!data.isUrgent) {
      const activeBlocks = timeline.filter((b) => b.status !== "UNPLUGGED");
      if (activeBlocks.length > 0) {
        const lastBlock = activeBlocks.reduce((prev, current) =>
          new Date(prev.endTime) > new Date(current.endTime) ? prev : current
        );
        const lastEnd = new Date(lastBlock.endTime);
        if (lastEnd > currentTime) {
          startTime = lastEnd;
        }
      }
    }

    const endTime = new Date(startTime.getTime() + duration * 60000);

    const [startH, startM] = user.dayStartTime.split(":").map(Number);
    const startOfLogicalDay = new Date(startTime);
    startOfLogicalDay.setHours(startH, startM, 0, 0);

    if (startTime < startOfLogicalDay) {
      startOfLogicalDay.setDate(startOfLogicalDay.getDate() - 1);
    }

    const endOfLogicalDay = new Date(startOfLogicalDay);
    endOfLogicalDay.setDate(endOfLogicalDay.getDate() + 1);

    if (endTime > endOfLogicalDay && !exceededConfirm) {
      setExceededConfirm({ data });
      return;
    }

    await onTaskSubmit(data);
    taskForm.reset({ title: "", hours: 0, minutes: 30, planningMemo: "", isUrgent: false });
    setExceededConfirm(null);
  };

  const handleTaskError = (errors: any) => {
    if (errors.minutes && taskForm.getValues("hours") === 0 && taskForm.getValues("minutes") === 0) {
      showToast(t.main?.toast?.set_duration || "수행 시간을 설정해주세요.", "error");
    } else if (errors.title) {
      showToast(t.main?.toast?.set_title || "태스크 제목을 입력해주세요.", "error");
    }
  };

  const handleEditTaskSubmit = async (blockId: number, data: any) => {
    await onEditTaskSubmit(blockId, data);
    setEditTaskBlock(null);
  };

  const calculateProgress = () => {
    const activeBlocks = timeline.filter((b) => b.status !== "UNPLUGGED");
    if (activeBlocks.length === 0) return 0;

    const totalMinutes = activeBlocks.reduce((acc, b) => {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      return acc + (end - start);
    }, 0);

    const doneMinutes = activeBlocks
      .filter((b) => b.status === "DONE" || b.status === "PENDING")
      .reduce((acc, b) => {
        const start = new Date(b.startTime).getTime();
        const end = new Date(b.endTime).getTime();
        return acc + (end - start);
      }, 0);

    return totalMinutes > 0 ? Math.round((doneMinutes / totalMinutes) * 100) : 0;
  };

  return {
    hoverTaskId,
    setHoverTaskId,
    deleteTaskProps,
    setDeleteTaskProps,
    isSplitDelete,
    setIsSplitDelete,
    moveAllConfirm,
    setMoveAllConfirm,
    exceededConfirm,
    setExceededConfirm,
    isInboxOpen,
    setIsInboxOpen,
    taskForm,
    handleTaskSubmit,
    handleTaskError,
    handleEditTaskSubmit,
    editTaskBlock,
    setEditTaskBlock,
    calculateProgress,
  };
};
