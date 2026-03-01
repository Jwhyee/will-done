import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, X, AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface WorkspaceSetupViewProps {
  t: any;
  isFirstWorkspace: boolean;
  onComplete: (workspaceId: number) => void;
  onCancel?: () => void;
}

const isStartTimeBeforeEnd = (start?: string, end?: string) => {
  if (!start || !end || start === "" || end === "") return true;
  return start < end;
};

export const WorkspaceSetupView = ({ t, isFirstWorkspace, onComplete, onCancel }: WorkspaceSetupViewProps) => {
  const workspaceSchema = z.object({
    name: z.string().min(1, t.workspace_setup.name_required),
    coreTimeStart: z.string().optional(),
    coreTimeEnd: z.string().optional(),
    roleIntro: z.string().optional(),
    unpluggedTimes: z.array(z.object({
      label: z.string().min(1, t.workspace_setup.label_required),
      startTime: z.string().min(1, "Required"),
      endTime: z.string().min(1, "Required"),
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

  const onWorkspaceSubmit = async (data: WorkspaceFormValues) => {
    try {
      const sanitizedData = {
        ...data,
        coreTimeStart: data.coreTimeStart || null,
        coreTimeEnd: data.coreTimeEnd || null,
        roleIntro: data.roleIntro || null,
      };
      const id = await invoke<number>("create_workspace", { input: sanitizedData });
      onComplete(id);
    } catch (error) {
      console.error("Workspace creation failed:", error);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Dialog 
        open={true} 
        onOpenChange={(open) => {
          if (!open && !isFirstWorkspace && onCancel) {
            onCancel();
          }
        }}
      >
        <DialogContent className={`sm:max-w-[550px] h-[85vh] bg-surface-elevated border-border text-text-primary shadow-2xl flex flex-col rounded-2xl p-0 border-t-border/50 overflow-hidden antialiased ${isFirstWorkspace ? "[&>button]:hidden" : ""}`}>
          <DialogHeader className="p-8 pb-4 shrink-0 space-y-3">
            <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none">
              {isFirstWorkspace ? t.workspace_setup.title_first : t.workspace_setup.title_new}
            </DialogTitle>
            <DialogDescription className="text-text-secondary font-bold text-sm">{t.workspace_setup.description}</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-8 scrollbar-hide">
            <form id="ws-form" onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-10 py-6">
              <div className="space-y-3">
                <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.name_label}</Label>
                <Input {...workspaceForm.register("name")} placeholder={t.workspace_setup.name_placeholder} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold" />
                {workspaceForm.formState.errors.name && (
                  <p className="text-[11px] text-danger font-bold flex items-center gap-1"><AlertCircle size={12}/> {workspaceForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.core_time}</Label>
                    <p className="text-[10px] text-text-secondary font-bold italic">{t.workspace_setup.core_time_guide}</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.preventDefault();
                      workspaceForm.setValue("coreTimeStart", "");
                      workspaceForm.setValue("coreTimeEnd", "");
                    }} 
                    className="h-8 text-[10px] font-black text-text-secondary hover:text-text-primary hover:bg-border transition-all rounded-lg uppercase tracking-wider"
                  >
                    {t.workspace_setup.core_time_reset}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Input type="time" {...workspaceForm.register("coreTimeStart")} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                  <Input type="time" {...workspaceForm.register("coreTimeEnd")} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                </div>
                {workspaceForm.formState.errors.coreTimeEnd && (
                  <p className="text-[11px] text-danger font-bold flex items-center gap-1"><AlertCircle size={12}/> {workspaceForm.formState.errors.coreTimeEnd.message}</p>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.unplugged_time}</Label>
                    <p className="text-[10px] text-text-secondary font-bold italic">{t.workspace_setup.unplugged_guide}</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.preventDefault();
                      append({ label: "", startTime: "12:00", endTime: "13:00" });
                    }} 
                    className="border-border bg-background hover:bg-border text-text-secondary font-black rounded-lg h-9"
                  >
                    <Plus size={16} className="mr-2" /> {t.workspace_setup.add_unplugged}
                  </Button>
                </div>
                
                <div className="space-y-4 pb-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-5 bg-background/60 border border-border rounded-2xl space-y-5 relative animate-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-text-muted tracking-widest uppercase">Block #{index + 1}</span>
                        <button type="button" onClick={() => remove(index)} className="text-text-muted hover:text-danger transition-colors active:scale-75">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                          <Input {...workspaceForm.register(`unpluggedTimes.${index}.label` as const)} placeholder={t.workspace_setup.unplugged_label_placeholder} className="bg-surface-elevated border-border h-11 rounded-xl px-4 font-bold" />
                          {workspaceForm.formState.errors.unpluggedTimes?.[index]?.label && (
                              <p className="text-[10px] text-danger font-bold pl-1">{workspaceForm.formState.errors.unpluggedTimes[index]?.label?.message}</p>
                          )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input type="time" {...workspaceForm.register(`unpluggedTimes.${index}.startTime` as const)} className="bg-surface-elevated border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                        <div className="space-y-1">
                          <Input type="time" {...workspaceForm.register(`unpluggedTimes.${index}.endTime` as const)} className="bg-surface-elevated border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                          {workspaceForm.formState.errors.unpluggedTimes?.[index]?.endTime && (
                              <p className="text-[10px] text-danger font-bold pl-1">{workspaceForm.formState.errors.unpluggedTimes[index]?.endTime?.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-3">
                <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.roleIntro}</Label>
                <textarea 
                  {...workspaceForm.register("roleIntro")}
                  placeholder={t.workspace_setup.role_placeholder}
                  className="w-full min-h-[140px] bg-background border-border rounded-2xl p-5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-text-muted font-bold leading-relaxed shadow-inner"
                />
              </div>
            </form>
          </div>

          <DialogFooter className="p-8 pt-4 pb-8 border-t border-border bg-surface-elevated shrink-0">
            <Button type="submit" form="ws-form" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-black h-12 rounded-xl text-md transition-all shadow-xl shadow-black/20 active:scale-95">
              {t.workspace_setup.submit_btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
