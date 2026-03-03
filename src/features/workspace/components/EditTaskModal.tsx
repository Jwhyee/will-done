import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimeBlock } from "@/types";

interface EditTaskModalProps {
    t: any;
    editTaskBlock: TimeBlock | null;
    onClose: () => void;
    onEditTaskSubmit: (blockId: number, data: {
        title: string;
        description: string;
        hours: number;
        minutes: number;
        reviewMemo: string;
    }) => Promise<void>;
}

export const EditTaskModal = ({
    t,
    editTaskBlock,
    onClose,
    onEditTaskSubmit,
}: EditTaskModalProps) => {
    const isDone = editTaskBlock?.status === "DONE";

    const editSchema = z.object({
        title: z.string().min(1, t.main?.toast?.set_title || "태스크 제목을 입력해주세요."),
        description: z.string().optional(),
        hours: z.number().min(0).max(23),
        minutes: z.number().min(0).max(59),
        reviewMemo: z.string().optional(),
    }).refine((data) => isDone || (data.hours > 0 || data.minutes > 0), {
        message: t.main?.toast?.set_duration || "수행 시간을 설정해주세요.",
        path: ["minutes"],
    });

    type EditFormValues = z.infer<typeof editSchema>;

    const form = useForm<EditFormValues>({
        resolver: zodResolver(editSchema),
        defaultValues: { title: "", description: "", hours: 0, minutes: 30, reviewMemo: "" },
    });

    useEffect(() => {
        if (editTaskBlock) {
            // Calculate duration
            let h = 0;
            let m = 30;
            if (!isDone && editTaskBlock.startTime && editTaskBlock.endTime) {
                const start = new Date(editTaskBlock.startTime).getTime();
                const end = new Date(editTaskBlock.endTime).getTime();
                const diffMins = Math.round((end - start) / 60000);
                if (diffMins > 0) {
                    h = Math.floor(diffMins / 60);
                    m = diffMins % 60;
                }
            }

            form.reset({
                title: editTaskBlock.title || "",
                description: "", // In models we have planning_memo on Task, but for now we'll just allow editing if backend supports it. For now leaving empty as per UI.
                hours: h,
                minutes: m,
                reviewMemo: editTaskBlock.reviewMemo || "",
            });
        }
    }, [editTaskBlock, form, isDone]);

    if (!editTaskBlock) return null;

    const onSubmit = async (data: EditFormValues) => {
        await onEditTaskSubmit(editTaskBlock.id, {
            title: data.title,
            description: data.description || "",
            hours: data.hours,
            minutes: data.minutes,
            reviewMemo: data.reviewMemo || "",
        });
        onClose();
    };

    return (
        <Dialog open={!!editTaskBlock} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[440px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-6 antialiased">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black tracking-tighter text-text-primary">
                        {t.main?.tooltip?.edit || "태스크 수정"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-text-secondary">제목</label>
                        <input
                            {...form.register("title")}
                            className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="태스크 제목"
                        />
                    </div>

                    {!isDone && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary">목표 시간</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="number"
                                    {...form.register("hours", { valueAsNumber: true })}
                                    className="w-20 bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-center"
                                    placeholder="0"
                                />
                                <span className="text-sm font-bold text-text-muted">시간</span>
                                <input
                                    type="number"
                                    {...form.register("minutes", { valueAsNumber: true })}
                                    className="w-20 bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-center"
                                    placeholder="30"
                                />
                                <span className="text-sm font-bold text-text-muted">분</span>
                            </div>
                        </div>
                    )}

                    {isDone && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary">업무 후기</label>
                            <textarea
                                {...form.register("reviewMemo")}
                                className="w-full h-24 bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                                placeholder="업무 후기를 남겨주세요."
                            />
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="bg-surface text-text-secondary hover:bg-border font-bold rounded-xl"
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            className="bg-accent text-text-primary hover:bg-accent/80 font-bold rounded-xl"
                        >
                            저장
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
