import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/types";
import { useToast } from "@/providers/ToastProvider";

interface SettingsViewProps {
  user: User;
  workspaceId: number;
  t: any;
  onClose: () => void;
  onUserUpdate: (updatedUser?: User) => Promise<void>;
  onWorkspaceUpdate: () => void;
}

export const SettingsView = ({ 
  user,
  workspaceId,
  t, 
  onClose,
  onUserUpdate,
  onWorkspaceUpdate,
}: SettingsViewProps) => {
  const [tab, setTab] = useState<"profile" | "workspace">("profile");
  const { showToast } = useToast();

  // User Form
  const userForm = useForm({
    defaultValues: {
      nickname: user.nickname,
      gemini_api_key: user.gemini_api_key || "",
      lang: user.lang
    }
  });

  // Workspace Form
  const workspaceForm = useForm({
    defaultValues: async () => {
      const ws = await invoke<any>("get_workspace", { id: workspaceId });
      const ut = await invoke<any[]>("get_unplugged_times", { workspaceId });
      return {
        name: ws.name,
        core_time_start: ws.core_time_start || "",
        core_time_end: ws.core_time_end || "",
        role_intro: ws.role_intro || "",
        unplugged_times: ut.map(u => ({ label: u.label, start_time: u.start_time, end_time: u.end_time }))
      };
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: workspaceForm.control,
    name: "unplugged_times"
  });

  useEffect(() => {
    userForm.reset({
      nickname: user.nickname,
      gemini_api_key: user.gemini_api_key || "",
      lang: user.lang
    });
  }, [user, userForm]);

  const onUserSubmit = async (data: any) => {
    try {
      const updatedUser = await invoke<User>("save_user", { 
        nickname: data.nickname, 
        gemini_api_key: data.gemini_api_key || null,
        lang: data.lang
      });
      await onUserUpdate(updatedUser);
      showToast(t.main.toast.profile_updated, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  const onWorkspaceSubmit = async (data: any) => {
    try {
      await invoke("update_workspace", {
        id: workspaceId,
        input: {
          ...data,
          core_time_start: data.core_time_start || null,
          core_time_end: data.core_time_end || null,
          role_intro: data.role_intro || null,
        }
      });
      await onWorkspaceUpdate();
      showToast(t.main.toast.workspace_updated, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-surface">
      <aside className="w-64 border-r border-border flex flex-col shrink-0 p-6 space-y-8">
        <Button 
          variant="ghost" 
          className="justify-start -ml-2 text-text-secondary hover:text-text-primary font-bold h-10 px-2 group transition-all"
          onClick={onClose}
        >
          <ChevronLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          {t.sidebar.back}
        </Button>

        <div className="space-y-4">
          <h2 className="text-xl font-black tracking-tighter text-text-primary">{t.sidebar.settings}</h2>
          <nav className="space-y-2">
            <Button 
              variant={tab === "profile" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("profile")}
            >
              {t.sidebar.profile}
            </Button>
            <Button 
              variant={tab === "workspace" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("workspace")}
            >
              {t.sidebar.workspace}
            </Button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-4xl">
          {tab === "profile" ? (
            <form key="profile-form" onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-12">
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-text-primary">{t.sidebar.profile}</h1>
                <p className="text-text-secondary font-bold">{t.sidebar.settings_desc}</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.onboarding.nickname_label}</Label>
                  <Input {...userForm.register("nickname")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold" />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.onboarding.api_key_label}</Label>
                  <Input type="password" {...userForm.register("gemini_api_key")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold" />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.sidebar.lang_label}</Label>
                  <select 
                    {...userForm.register("lang")}
                    className="w-full h-12 bg-surface-elevated border border-border rounded-xl px-4 font-bold text-text-primary outline-none focus:ring-1 focus:ring-white/10 appearance-none"
                  >
                    <option value="ko">한국어 (Korean)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-black h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95">
                  {t.sidebar.save_changes}
                </Button>
              </div>
            </form>
          ) : (
            <form key="workspace-form" onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-12">
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-text-primary">{t.sidebar.workspace}</h1>
                <p className="text-text-secondary font-bold">{t.sidebar.workspace_settings_desc}</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.name_label}</Label>
                  <Input {...workspaceForm.register("name")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold" />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.core_time}</Label>
                  <div className="grid grid-cols-2 gap-6">
                    <Input type="time" {...workspaceForm.register("core_time_start")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                    <Input type="time" {...workspaceForm.register("core_time_end")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.unplugged_time}</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ label: "", start_time: "12:00", end_time: "13:00" })} 
                      className="border-border bg-surface-elevated hover:bg-border text-text-secondary font-black rounded-lg h-9"
                    >
                      <Plus size={16} className="mr-2" /> {t.workspace_setup.add_unplugged}
                    </Button>
                  </div>
                  <div className="space-y-4 pb-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-5 bg-surface-elevated/60 border border-border rounded-2xl space-y-4 relative">
                        <button type="button" onClick={() => remove(index)} className="absolute top-4 right-4 text-text-muted hover:text-danger transition-colors">
                          <X size={16} />
                        </button>
                        <Input {...workspaceForm.register(`unplugged_times.${index}.label` as const)} placeholder={t.workspace_setup.unplugged_label_placeholder} className="bg-surface border-border h-11 rounded-xl px-4 font-bold" />
                        <div className="grid grid-cols-2 gap-4">
                          <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.start_time` as const)} className="bg-surface border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                          <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.end_time` as const)} className="bg-surface border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.role_intro}</Label>
                  <textarea 
                    {...workspaceForm.register("role_intro")}
                    placeholder={t.workspace_setup.role_placeholder}
                    className="w-full min-h-[120px] bg-surface-elevated border-border rounded-2xl p-5 text-sm text-text-primary focus:outline-none placeholder:text-text-muted font-bold leading-relaxed"
                  />
                </div>

                <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-black h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95">
                  {t.sidebar.save_changes}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
