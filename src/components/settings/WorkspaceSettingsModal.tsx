import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/providers/ToastProvider";

interface WorkspaceSettingsModalProps {
  workspaceId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceUpdate: () => void;
  onWorkspaceDelete?: (id: number) => void;
  workspaceCount: number;
  t: any;
}

export const WorkspaceSettingsModal = ({
  workspaceId,
  isOpen,
  onClose,
  onWorkspaceUpdate,
  onWorkspaceDelete,
  workspaceCount,
  t,
}: WorkspaceSettingsModalProps) => {
  const { showToast } = useToast();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [targetWorkspaceName, setTargetWorkspaceName] = useState("");

  const { register, handleSubmit, control, reset } = useForm({
    defaultValues: {
      name: "",
      coreTimeStart: "",
      coreTimeEnd: "",
      roleIntro: "",
      unpluggedTimes: [] as { label: string; startTime: string; endTime: string }[]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "unpluggedTimes"
  });

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      if (isOpen && workspaceId) {
        try {
          const ws = await invoke<any>("get_workspace", { id: workspaceId });
          const ut = await invoke<any[]>("get_unplugged_times", { workspaceId });
          setTargetWorkspaceName(ws.name);
          reset({
            name: ws.name,
            coreTimeStart: ws.coreTimeStart || "",
            coreTimeEnd: ws.coreTimeEnd || "",
            roleIntro: ws.roleIntro || "",
            unpluggedTimes: ut.map(u => ({ 
              label: u.label, 
              startTime: u.startTime, 
              endTime: u.endTime 
            }))
          });
        } catch (error: any) {
          showToast(error.toString(), "error");
        }
      }
    };
    fetchWorkspaceData();
  }, [isOpen, workspaceId, reset, showToast]);

  const onSubmit = async (data: any) => {
    if (!workspaceId) return;
    try {
      await invoke("update_workspace", {
        id: workspaceId,
        input: {
          ...data,
          coreTimeStart: data.coreTimeStart || null,
          coreTimeEnd: data.coreTimeEnd || null,
          roleIntro: data.roleIntro || null,
          unpluggedTimes: data.unpluggedTimes || []
        }
      });
      await onWorkspaceUpdate();
      showToast(t.main.toast.workspace_updated, "success");
      onClose();
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceId) return;
    if (workspaceCount <= 1) {
      showToast(t.sidebar.workspace_delete_min_error || "최소 하나 이상의 워크스페이스가 필요합니다.", "error");
      return;
    }
    if (deleteInput !== targetWorkspaceName) {
      showToast(t.sidebar.workspace_delete_name_error || "워크스페이스 이름이 일치하지 않습니다.", "error");
      return;
    }

    try {
      await invoke("delete_workspace", { id: workspaceId });
      showToast(t.sidebar.workspace_deleted || "워크스페이스가 삭제되었습니다.", "success");
      setIsDeleteConfirmOpen(false);
      onClose();
      if (onWorkspaceDelete) {
        onWorkspaceDelete(workspaceId);
      }
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-2xl p-0 overflow-hidden antialiased">
          <DialogHeader className="p-8 pb-4 shrink-0 space-y-1.5">
            <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none">
              {t.sidebar.workspace}
            </DialogTitle>
            <DialogDescription className="text-sm text-text-secondary leading-relaxed">
              {t.sidebar.workspace_settings_desc}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-8 space-y-6">
            <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-1 -mr-1 scrollbar-hide">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.name_label}</Label>
                <Input {...register("name")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium focus:ring-1 focus:ring-white/10" />
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.core_time}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="time" {...register("coreTimeStart")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium [color-scheme:dark] focus:ring-1 focus:ring-white/10" />
                  <Input type="time" {...register("coreTimeEnd")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium [color-scheme:dark] focus:ring-1 focus:ring-white/10" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.unplugged_time}</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => append({ label: "", startTime: "12:00", endTime: "13:00" })} 
                    className="border-border bg-surface hover:bg-border text-text-secondary font-bold rounded-lg h-8 px-3"
                  >
                    <Plus size={14} className="mr-2" /> {t.workspace_setup.add_unplugged}
                  </Button>
                </div>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 bg-surface border border-border rounded-xl space-y-3 relative">
                      <button type="button" onClick={() => remove(index)} className="absolute top-3 right-3 text-text-muted hover:text-danger transition-colors">
                        <X size={14} />
                      </button>
                      <Input {...register(`unpluggedTimes.${index}.label` as const)} placeholder={t.workspace_setup.unplugged_label_placeholder} className="bg-background border-border h-10 rounded-lg px-3 text-sm" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input type="time" {...register(`unpluggedTimes.${index}.startTime` as const)} className="bg-background border-border h-10 rounded-lg text-sm [color-scheme:dark]" />
                        <Input type="time" {...register(`unpluggedTimes.${index}.endTime` as const)} className="bg-background border-border h-10 rounded-lg text-sm [color-scheme:dark]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.roleIntro}</Label>
                <textarea 
                  {...register("roleIntro")}
                  placeholder={t.workspace_setup.role_placeholder}
                  className="w-full min-h-[100px] bg-surface border border-border rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-text-muted font-medium leading-relaxed resize-none"
                />
              </div>

              <Separator className="bg-border/50 my-6" />

              <div className="space-y-4 pt-2">
                <Label className="text-xs font-bold text-danger uppercase tracking-widest">Danger Zone</Label>
                <div className="p-5 border border-danger/20 bg-danger/5 rounded-2xl space-y-3">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {t.sidebar.workspace_delete_desc || "워크스페이스 삭제 시 모든 데이터가 영구적으로 삭제됩니다."}
                  </p>
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="w-full bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 font-bold h-11 rounded-xl transition-all active:scale-95"
                  >
                    {t.sidebar.workspace_delete_btn || "워크스페이스 삭제"}
                  </Button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95">
              {t.sidebar.save_changes}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
              <AlertTriangle className="text-danger" size={20} />
              {t.sidebar.workspace_delete_confirm_title || "워크스페이스 삭제"}
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm leading-relaxed">
              {t.sidebar.workspace_delete_confirm_desc || "이 워크스페이스를 삭제하시겠습니까? 삭제 시 해당 워크스페이스에서 작성한 모든 태스크, 타임라인 기록, AI 회고 데이터가 영구히 삭제되며 복구할 수 없습니다."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                {(t.sidebar.workspace_delete_input_label || "확인을 위해 워크스페이스 이름을 입력하세요: {name}").replace("{name}", targetWorkspaceName)}
              </Label>
              <Input 
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={targetWorkspaceName}
                className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium focus:ring-1 focus:ring-danger/30"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeleteInput("");
                }}
                className="flex-1 bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold rounded-xl h-12"
              >
                {t.sidebar.cancel || "취소"}
              </Button>
              <Button
                disabled={deleteInput !== targetWorkspaceName}
                onClick={handleDeleteWorkspace}
                className="flex-1 bg-danger text-text-primary hover:bg-danger/80 font-bold rounded-xl h-12 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
              >
                {t.sidebar.workspace_delete_confirm_btn || "삭제"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
