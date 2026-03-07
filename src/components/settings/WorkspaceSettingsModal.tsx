import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm, useFieldArray } from "react-hook-form";
import { AlertTriangle, Settings2, Clock, ShieldAlert } from "lucide-react";
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
import { useToast } from "@/providers/ToastProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceBasicTab } from "./WorkspaceBasicTab";
import { WorkspaceTimeTab } from "./WorkspaceTimeTab";
import { WorkspaceAdvancedTab } from "./WorkspaceAdvancedTab";

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
      showToast(t.sidebar.workspace_delete_min_error, "error");
      return;
    }
    if (deleteInput !== targetWorkspaceName) {
      showToast(t.sidebar.workspace_delete_name_error, "error");
      return;
    }

    try {
      await invoke("delete_workspace", { id: workspaceId });
      showToast(t.sidebar.workspace_deleted, "success");
      setIsDeleteConfirmOpen(false);
      onClose();
      if (onWorkspaceDelete) onWorkspaceDelete(workspaceId);
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px] h-[640px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-2xl p-0 flex flex-col overflow-hidden antialiased">
          <DialogHeader className="p-8 pb-4 shrink-0 space-y-1.5">
            <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none">
              {t.sidebar.workspace}
            </DialogTitle>
            <DialogDescription className="text-sm text-text-secondary leading-relaxed">
              {t.sidebar.workspace_settings_desc}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden px-8">
              <TabsList className="w-full h-11 bg-surface border border-border/50 p-1 mb-6 shrink-0 flex overflow-x-auto scrollbar-hide">
                <TabsTrigger value="basic" className="flex-1 gap-2 whitespace-nowrap shrink-0"><Settings2 size={14} />{t.sidebar.workspace_tab_basic}</TabsTrigger>
                <TabsTrigger value="time" className="flex-1 gap-2 whitespace-nowrap shrink-0"><Clock size={14} />{t.sidebar.workspace_tab_time}</TabsTrigger>
                <TabsTrigger value="advanced" className="flex-1 gap-2 whitespace-nowrap shrink-0"><ShieldAlert size={14} />{t.sidebar.workspace_tab_advanced}</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="basic" className="h-full m-0 outline-none data-[state=inactive]:hidden">
                  <WorkspaceBasicTab register={register} t={t} />
                </TabsContent>
                <TabsContent value="time" className="h-full m-0 outline-none data-[state=inactive]:hidden">
                  <WorkspaceTimeTab register={register} fields={fields} append={append} remove={remove} t={t} />
                </TabsContent>
                <TabsContent value="advanced" className="h-full m-0 outline-none data-[state=inactive]:hidden">
                  <WorkspaceAdvancedTab setIsDeleteConfirmOpen={setIsDeleteConfirmOpen} t={t} />
                </TabsContent>
              </div>
            </Tabs>

            <div className="p-8 pt-4 bg-surface-elevated shrink-0 border-t border-border/50">
              <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95">
                {t.sidebar.save_changes}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
              <AlertTriangle className="text-danger" size={20} />
              {t.sidebar.workspace_delete_confirm_title}
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm leading-relaxed">{t.sidebar.workspace_delete_confirm_desc}</DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{(t.sidebar.workspace_delete_input_label || "").replace("{name}", targetWorkspaceName)}</Label>
              <Input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder={targetWorkspaceName} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium focus:ring-1 focus:ring-danger/30" />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { setIsDeleteConfirmOpen(false); setDeleteInput(""); }} className="flex-1 bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold rounded-xl h-12">{t.sidebar.cancel}</Button>
              <Button disabled={deleteInput !== targetWorkspaceName} onClick={handleDeleteWorkspace} className="flex-1 bg-danger text-text-primary hover:bg-danger/80 font-bold rounded-xl h-12 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale">{t.sidebar.workspace_delete_confirm_btn}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ >
  );
};
