import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimePicker } from "./TimePicker";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { TimeBlock } from "@/types";

interface EditTaskModalProps {
    t: any;
    editTaskBlock: TimeBlock | null;
    onClose: () => void;
    onEditTaskSubmit: (blockId: number, data: {
        title: string;
        planningMemo: string;
        hours: number;
        minutes: number;
        reviewMemo: string;
        projectName?: string;
        labelName?: string;
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
        title: z.string().min(1, t.main.toast.set_title),
        planningMemo: z.string().optional(),
        hours: z.number().min(0).max(23),
        minutes: z.number().min(0).max(59),
        reviewMemo: z.string().optional(),
        projectName: z.string().optional(),
        labelName: z.string().optional(),
    }).refine((data) => isDone || (data.hours > 0 || data.minutes > 0), {
        message: t.main.toast.set_duration,
        path: ["minutes"],
    });

    type EditFormValues = z.infer<typeof editSchema>;

    const form = useForm<EditFormValues>({
        resolver: zodResolver(editSchema),
        defaultValues: { title: "", planningMemo: "", hours: 0, minutes: 30, reviewMemo: "", projectName: "", labelName: "" },
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
                planningMemo: (editTaskBlock as any).planningMemo || "",
                hours: h,
                minutes: m,
                reviewMemo: editTaskBlock.reviewMemo || "",
                projectName: editTaskBlock.projectName || "",
                labelName: editTaskBlock.labelName || "",
            });
        }
    }, [editTaskBlock, form, isDone]);

    if (!editTaskBlock) return null;

    const onSubmit = async (data: EditFormValues) => {
        await onEditTaskSubmit(editTaskBlock.id, {
            title: data.title,
            planningMemo: data.planningMemo || "",
            hours: data.hours,
            minutes: data.minutes,
            reviewMemo: data.reviewMemo || "",
            projectName: data.projectName,
            labelName: data.labelName,
        });
        onClose();
    };

    return (
        <Dialog open={!!editTaskBlock} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[440px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-6 antialiased">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-xl font-black tracking-tighter text-text-primary">
                        {t.main.edit_task.title}
                    </DialogTitle>
                    <DialogDescription className="text-text-secondary text-[11px] font-medium">
                        {t.main.edit_task.description.replace("{title}", editTaskBlock.title)}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-text-secondary">{t.main.edit_task.name_label}</label>
                        <input
                            {...form.register("title")}
                            className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder={t.main.edit_task.name_placeholder}
                        />
                    </div>

                    <div className="flex gap-2">
                        <div className="space-y-2 flex-1">
                            <label className="text-xs font-bold text-text-secondary">Project</label>
                            <CreatableSelect
                                value={form.watch("projectName") || ""}
                                onChange={(val: string) => form.setValue("projectName", val)}
                                placeholder="Project..."
                                fetchCommand="get_projects"
                            />
                        </div>
                        <div className="space-y-2 flex-1">
                            <label className="text-xs font-bold text-text-secondary">Label</label>
                            <CreatableSelect
                                value={form.watch("labelName") || ""}
                                onChange={(val: string) => form.setValue("labelName", val)}
                                placeholder="Label..."
                                fetchCommand="get_labels"
                            />
                        </div>
                    </div>

                    {!isDone && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-secondary">{t.main.edit_task.duration_label}</label>
                                <TimePicker
                                    hours={form.watch("hours")}
                                    minutes={form.watch("minutes")}
                                    onChange={(h, m) => {
                                        form.setValue("hours", h);
                                        form.setValue("minutes", m);
                                    }}
                                    t={t}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-secondary">{t.main.edit_task.plan_label}</label>
                                <textarea
                                    {...form.register("planningMemo")}
                                    className="w-full h-24 bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                                    placeholder={t.main.edit_task.plan_placeholder}
                                />
                            </div>
                        </>
                    )}

                    {isDone && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary">{t.main.edit_task.review_label}</label>
                            <textarea
                                {...form.register("reviewMemo")}
                                className="w-full h-24 bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                                placeholder={t.main.edit_task.review_placeholder}
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
                            {t.main.edit_task.cancel_btn}
                        </Button>
                        <Button
                            type="submit"
                            className="bg-accent text-text-primary hover:bg-accent/80 font-bold rounded-xl"
                        >
                            {t.main.edit_task.save_btn}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
