import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, X, ChevronLeft, Bell } from "lucide-react";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
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
      geminiApiKey: user.geminiApiKey || "",
      lang: user.lang,
      isNotificationEnabled: user.isNotificationEnabled
    }
  });

  // Workspace Form
  const workspaceForm = useForm({
    defaultValues: async () => {
      const ws = await invoke<any>("get_workspace", { id: workspaceId });
      const ut = await invoke<any[]>("get_unpluggedTimes", { workspaceId });
      return {
        name: ws.name,
        coreTimeStart: ws.coreTimeStart || "",
        coreTimeEnd: ws.coreTimeEnd || "",
        roleIntro: ws.roleIntro || "",
        unpluggedTimes: ut.map(u => ({ label: u.label, startTime: u.startTime, endTime: u.endTime }))
      };
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: workspaceForm.control,
    name: "unpluggedTimes"
  });

  useEffect(() => {
    userForm.reset({
      nickname: user.nickname,
      geminiApiKey: user.geminiApiKey || "",
      lang: user.lang,
      isNotificationEnabled: user.isNotificationEnabled
    });
  }, [user, userForm]);

  const onUserSubmit = async (data: any) => {
    try {
      const updatedUser = await invoke<User>("save_user", { 
        nickname: data.nickname, 
        geminiApiKey: data.geminiApiKey || null,
        lang: data.lang,
        isNotificationEnabled: data.isNotificationEnabled
      });
      await onUserUpdate(updatedUser);
      showToast(t.main.toast.profile_updated, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      let permission = await isPermissionGranted();
      if (!permission) {
        permission = await requestPermission() === "granted";
      }
      userForm.setValue("isNotificationEnabled", permission);
    } else {
      userForm.setValue("isNotificationEnabled", false);
    }
  };

  const onWorkspaceSubmit = async (data: any) => {
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
          <h2 className="text-lg font-bold tracking-tight text-text-primary">{t.sidebar.settings}</h2>
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

      <main className="flex-1 overflow-y-auto p-12 bg-background">
        <div className="max-w-4xl">
          {tab === "profile" ? (
            <form key="profile-form" onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-12">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-black tracking-tighter text-text-primary leading-none">{t.sidebar.profile}</h1>
                <p className="text-sm text-text-secondary leading-relaxed">{t.sidebar.settings_desc}</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.onboarding.nickname_label}</Label>
                  <Input {...userForm.register("nickname")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium" />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.onboarding.api_key_label}</Label>
                  <Input type="password" {...userForm.register("geminiApiKey")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium" />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.sidebar.lang_label}</Label>
                  <select 
                    {...userForm.register("lang")}
                    className="w-full h-12 bg-surface border border-border rounded-xl px-4 font-medium text-text-primary outline-none focus:ring-1 focus:ring-white/10 appearance-none"
                  >
                    <option value="ko">한국어 (Korean)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="space-y-3 pt-4">
                  <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.sidebar.notification_settings}</Label>
                  <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-text-primary flex items-center gap-2 uppercase tracking-widest">
                        <Bell size={14} /> {t.onboarding.notification_label}
                      </Label>
                      <p className="text-[10px] text-text-secondary leading-none">{t.onboarding.notification_guide}</p>
                    </div>
                    <input 
                      type="checkbox"
                      {...userForm.register("isNotificationEnabled")}
                      onChange={(e) => handleNotificationToggle(e.target.checked)}
                      className="w-5 h-5 rounded-md accent-text-primary cursor-pointer"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95">
                  {t.sidebar.save_changes}
                </Button>
              </div>
            </form>
          ) : (
            <form key="workspace-form" onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-12">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-black tracking-tighter text-text-primary leading-none">{t.sidebar.workspace}</h1>
                <p className="text-sm text-text-secondary leading-relaxed">{t.sidebar.workspace_settings_desc}</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.name_label}</Label>
                  <Input {...workspaceForm.register("name")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium" />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.core_time}</Label>
                  <div className="grid grid-cols-2 gap-6">
                    <Input type="time" {...workspaceForm.register("coreTimeStart")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium [color-scheme:dark]" />
                    <Input type="time" {...workspaceForm.register("coreTimeEnd")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium [color-scheme:dark]" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.unplugged_time}</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ label: "", startTime: "12:00", endTime: "13:00" })} 
                      className="border-border bg-surface hover:bg-border text-text-secondary font-bold rounded-lg h-9"
                    >
                      <Plus size={16} className="mr-2" /> {t.workspace_setup.add_unplugged}
                    </Button>
                  </div>
                  <div className="space-y-4 pb-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-5 bg-surface/60 border border-border rounded-2xl space-y-4 relative">
                        <button type="button" onClick={() => remove(index)} className="absolute top-4 right-4 text-text-muted hover:text-danger transition-colors">
                          <X size={16} />
                        </button>
                        <Input {...workspaceForm.register(`unpluggedTimes.${index}.label` as const)} placeholder={t.workspace_setup.unplugged_label_placeholder} className="bg-background border-border h-11 rounded-xl px-4 font-medium" />
                        <div className="grid grid-cols-2 gap-4">
                          <Input type="time" {...workspaceForm.register(`unpluggedTimes.${index}.startTime` as const)} className="bg-background border-border h-11 rounded-xl font-medium [color-scheme:dark]" />
                          <Input type="time" {...workspaceForm.register(`unpluggedTimes.${index}.endTime` as const)} className="bg-background border-border h-11 rounded-xl font-medium [color-scheme:dark]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.roleIntro}</Label>
                  <textarea 
                    {...workspaceForm.register("roleIntro")}
                    placeholder={t.workspace_setup.role_placeholder}
                    className="w-full min-h-[120px] bg-surface border-border rounded-2xl p-5 text-sm text-text-primary focus:outline-none placeholder:text-text-muted font-medium leading-relaxed"
                  />
                </div>

                <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95">
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
