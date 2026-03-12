import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, X, AlertCircle, ChevronRight, Layout, Clock, Info } from "lucide-react";
import { workspaceApi } from "@/features/workspace/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkspaceCreateModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (workspaceId: number) => void;
  isFirst?: boolean;
}

const isStartTimeBeforeEnd = (start?: string, end?: string) => {
  if (!start || !end || start === "" || end === "") return true;
  return start < end;
};

export const WorkspaceCreateModal = ({ t, isOpen, onClose, onSuccess, isFirst = false }: WorkspaceCreateModalProps) => {
  const [activeStep, setActiveStep] = useState<"basic" | "time">("basic");

  const workspaceSchema = z.object({
    name: z.string().min(1, t.workspace_setup.name_required),
    coreTimeStart: z.string().optional(),
    coreTimeEnd: z.string().optional(),
    roleIntro: z.string().optional(),
    unpluggedTimes: z.array(z.object({
      label: z.string().min(1, t.workspace_setup.label_required),
      startTime: z.string().min(1, t.common.required),
      endTime: z.string().min(1, t.common.required),
    })).superRefine((items, ctx) => {
      items.forEach((item, index) => {
        if (!isStartTimeBeforeEnd(item.startTime, item.endTime)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t.workspace_setup.core_time_error,
            path: [index, "endTime"],
          });
        }
      });
    }),
  }).refine((data) => isStartTimeBeforeEnd(data.coreTimeStart || undefined, data.coreTimeEnd || undefined), {
    message: t.workspace_setup.core_time_error,
    path: ["coreTimeEnd"],
  });

  type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

  const workspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      coreTimeStart: "",
      coreTimeEnd: "",
      roleIntro: "",
      unpluggedTimes: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: workspaceForm.control,
    name: "unpluggedTimes",
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      workspaceForm.reset({
        name: "",
        coreTimeStart: "",
        coreTimeEnd: "",
        roleIntro: "",
        unpluggedTimes: []
      });
      setActiveStep("basic");
    }
  }, [isOpen, workspaceForm]);

  const onWorkspaceSubmit = async (data: WorkspaceFormValues) => {
    try {
      const sanitizedData = {
        ...data,
        coreTimeStart: data.coreTimeStart || null,
        coreTimeEnd: data.coreTimeEnd || null,
        roleIntro: data.roleIntro || null,
      };
      const id = await workspaceApi.createWorkspace(sanitizedData);
      onSuccess(id);
    } catch (error) {
      console.error("Workspace creation failed:", error);
    }
  };

  const hasBasicErrors = !!(workspaceForm.formState.errors.name || workspaceForm.formState.errors.roleIntro);
  const hasTimeErrors = !!(workspaceForm.formState.errors.coreTimeEnd || workspaceForm.formState.errors.unpluggedTimes);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] h-[640px] bg-surface-elevated border-border text-text-primary shadow-2xl flex flex-col rounded-3xl p-0 border-t-border/50 overflow-hidden antialiased">
        <DialogHeader className="p-8 pb-4 shrink-0 space-y-4 text-left">
          <div className="space-y-2">
            <DialogTitle className="text-3xl font-black tracking-tighter text-text-primary leading-none">
              {isFirst ? t.workspace_setup.title_first : t.workspace_setup.title_new}
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm font-medium leading-relaxed">
              {t.workspace_setup.description}
            </DialogDescription>
          </div>

          <div className="flex p-1 bg-surface rounded-xl border border-border/50">
            <button
              onClick={() => setActiveStep("basic")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                activeStep === "basic"
                  ? "bg-surface-elevated text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] border transition-colors",
                activeStep === "basic" ? "bg-text-primary text-background border-text-primary" : "border-border text-text-muted"
              )}>1</div>
              {t.workspace_setup.tab_basic}
              {hasBasicErrors && <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
            </button>
            <button
              onClick={() => setActiveStep("time")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                activeStep === "time"
                  ? "bg-surface-elevated text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] border transition-colors",
                activeStep === "time" ? "bg-text-primary text-background border-text-primary" : "border-border text-text-muted"
              )}>2</div>
              {t.workspace_setup.tab_time}
              {hasTimeErrors && <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-hide">
            <AnimatePresence mode="wait">
              {activeStep === "basic" ? (
                <motion.div
                  key="basic"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                      <Layout size={14} />
                      {t.workspace_setup.name_label}
                    </div>
                    <div className="space-y-2">
                      <Input
                        {...workspaceForm.register("name")}
                        placeholder={t.workspace_setup.name_placeholder}
                        className="bg-background border-border text-text-primary h-14 rounded-2xl px-5 text-lg font-bold focus:ring-1 focus:ring-white/10"
                      />
                      {workspaceForm.formState.errors.name && (
                        <p className="text-xs text-danger font-bold flex items-center gap-1.5 pl-1">
                          <AlertCircle size={14} /> {workspaceForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                      <Layout size={14} />
                      {t.workspace_setup.role_intro}
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info size={12} className="text-text-muted hover:text-text-secondary cursor-help transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[220px] text-xs leading-relaxed">
                            {t.workspace_setup.role_intro_tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <textarea
                      {...workspaceForm.register("roleIntro")}
                      placeholder={t.workspace_setup.role_placeholder}
                      className="w-full min-h-[160px] bg-background border-border rounded-2xl p-5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-text-muted font-medium leading-relaxed shadow-inner resize-none"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="time"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                        <Clock size={14} />
                        {t.workspace_setup.core_time}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          workspaceForm.setValue("coreTimeStart", "");
                          workspaceForm.setValue("coreTimeEnd", "");
                        }}
                        className="h-7 text-[10px] font-black text-text-muted hover:text-text-primary transition-all rounded-lg uppercase tracking-wider"
                      >
                        {t.workspace_setup.core_time_reset}
                      </Button>
                    </div>
                    <div className="p-4 bg-surface rounded-2xl border border-border/50 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{t.common.start}</Label>
                          <Input type="time" {...workspaceForm.register("coreTimeStart")} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{t.common.end}</Label>
                          <Input type="time" {...workspaceForm.register("coreTimeEnd")} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                        </div>
                      </div>
                      <p className="text-[11px] text-text-secondary font-medium leading-relaxed pl-1 italic opacity-80">
                        {t.workspace_setup.core_time_guide}
                      </p>
                      {workspaceForm.formState.errors.coreTimeEnd && (
                        <p className="text-xs text-danger font-bold flex items-center gap-1.5 pl-1">
                          <AlertCircle size={14} /> {workspaceForm.formState.errors.coreTimeEnd.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                        <Clock size={14} />
                        {t.workspace_setup.unplugged_time}
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info size={12} className="text-text-muted hover:text-text-secondary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[240px] text-xs leading-relaxed">
                              {t.workspace_setup.unplugged_tooltip}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ label: "", startTime: "12:00", endTime: "13:00" })}
                        className="border-border bg-background hover:bg-surface text-text-primary font-bold rounded-xl h-9 text-xs transition-all shadow-sm active:scale-95"
                      >
                        <Plus size={14} className="mr-2" /> {t.workspace_setup.add_unplugged}
                      </Button>
                    </div>

                    <div className="space-y-4 pb-2">
                      {fields.length === 0 && (
                        <div className="py-8 text-center border-2 border-dashed border-border rounded-3xl opacity-50">
                          <p className="text-xs font-bold text-text-muted tracking-widest uppercase">{t.workspace_setup.unplugged_guide}</p>
                        </div>
                      )}
                      {fields.map((field, index) => (
                        <motion.div
                          key={field.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-5 bg-background border border-border rounded-2xl space-y-4 relative shadow-sm group hover:border-text-primary/10 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-text-muted tracking-widest uppercase">{t.workspace_setup.unplugged_block_label} #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-text-muted hover:text-danger transition-colors p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="space-y-4">
                            <Input
                              {...workspaceForm.register(`unpluggedTimes.${index}.label` as const)}
                              placeholder={t.workspace_setup.unplugged_label_placeholder}
                              className="bg-surface border-border h-12 rounded-xl px-4 font-bold"
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <Input type="time" {...workspaceForm.register(`unpluggedTimes.${index}.startTime` as const)} className="bg-surface border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                              <Input type="time" {...workspaceForm.register(`unpluggedTimes.${index}.endTime` as const)} className="bg-surface border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                            </div>
                            {(workspaceForm.formState.errors.unpluggedTimes?.[index]?.label || workspaceForm.formState.errors.unpluggedTimes?.[index]?.endTime) && (
                              <p className="text-xs text-danger font-bold flex items-center gap-1.5 pl-1">
                                <AlertCircle size={14} /> {workspaceForm.formState.errors.unpluggedTimes?.[index]?.label?.message || workspaceForm.formState.errors.unpluggedTimes?.[index]?.endTime?.message}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-8 border-t border-border bg-surface-elevated shrink-0 mt-auto">
            {activeStep === "basic" ? (
              <Button
                type="button"
                onClick={() => setActiveStep("time")}
                className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-14 rounded-2xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {t.workspace_setup.next_btn}
                <ChevronRight size={20} />
              </Button>
            ) : (
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveStep("basic")}
                  className="flex-1 bg-background border-border text-text-primary hover:bg-surface h-14 rounded-2xl font-bold transition-all"
                >
                  {t.workspace_setup.prev_btn}
                </Button>
                <Button
                  type="submit"
                  className="flex-[2] bg-text-primary text-background hover:bg-zinc-200 font-bold h-14 rounded-2xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95"
                >
                  {isFirst ? t.workspace_setup.submit_btn : t.workspace_setup.title_new}
                </Button>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
