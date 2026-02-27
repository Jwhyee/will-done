import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Settings, Search, X, AlertCircle } from "lucide-react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { translations, getLang } from "@/lib/i18n";

// --- Time Helper ---
const isStartTimeBeforeEnd = (start?: string, end?: string) => {
  if (!start || !end) return true;
  return start < end;
};

function App() {
  const [view, setView] = useState<"loading" | "onboarding" | "workspace_setup" | "main">("loading");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

  const lang = useMemo(() => getLang(), []);
  const t = translations[lang];

  // --- Validation Schemas ---
  const userSchema = z.object({
    nickname: z.string().min(1, t.onboarding.nickname_required).max(20),
    gemini_api_key: z.string().optional(),
  });

  const workspaceSchema = z.object({
    name: z.string().min(1, t.workspace_setup.name_required),
    core_time_start: z.string().optional(),
    core_time_end: z.string().optional(),
    role_intro: z.string().optional(),
    unplugged_times: z.array(z.object({
      label: z.string().min(1, t.workspace_setup.label_required),
      start_time: z.string().min(1, "Required"),
      end_time: z.string().min(1, "Required"),
    })).superRefine((items, ctx) => {
      items.forEach((item, index) => {
        if (!isStartTimeBeforeEnd(item.start_time, item.end_time)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t.workspace_setup.core_time_error,
            path: [index, "end_time"],
          });
        }
      });
    }),
  }).refine((data) => isStartTimeBeforeEnd(data.core_time_start, data.core_time_end), {
    message: t.workspace_setup.core_time_error,
    path: ["core_time_end"],
  });

  type UserFormValues = z.infer<typeof userSchema>;
  type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

  // --- Forms ---
  const userForm = useForm<UserFormValues>({ 
    resolver: zodResolver(userSchema),
    defaultValues: { nickname: "", gemini_api_key: "" }
  });

  const workspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { 
      name: "", 
      core_time_start: "09:00", 
      core_time_end: "18:00", 
      role_intro: "",
      unplugged_times: [] 
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: workspaceForm.control,
    name: "unplugged_times",
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const userExists = await invoke<boolean>("check_user_exists");
      if (!userExists) {
        setView("onboarding");
        return;
      }
      const wsList = await invoke<any[]>("get_workspaces");
      setWorkspaces(wsList);

      if (wsList.length === 0) {
        setView("workspace_setup");
      } else {
        setActiveWorkspaceId(wsList[0].id);
        setView("main");
      }
    } catch (error) {
      console.error("Init failed:", error);
    }
  };

  const onUserSubmit = async (data: UserFormValues) => {
    await invoke("save_user", { nickname: data.nickname, gemini_api_key: data.gemini_api_key || null });
    setView("workspace_setup");
  };

  const onWorkspaceSubmit = async (data: WorkspaceFormValues) => {
    try {
      const id = await invoke<number>("create_workspace", { input: data });
      const wsList = await invoke<any[]>("get_workspaces");
      setWorkspaces(wsList);
      setActiveWorkspaceId(id);
      workspaceForm.reset(); // 폼 초기화
      setView("main");
    } catch (error) {
      console.error("Workspace creation failed:", error);
    }
  };

  if (view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white antialiased">
        <p className="animate-pulse font-bold tracking-tight">{t.checking}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex overflow-hidden font-sans antialiased select-none">
      
      {/* 1차 사이드바 */}
      {view === "main" && (
        <aside className="w-16 border-r border-[#27272a] bg-[#09090b] flex flex-col items-center py-4 space-y-4 shrink-0 shadow-2xl z-20">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspaceId(ws.id)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 transform ${
                activeWorkspaceId === ws.id 
                ? "bg-white text-black scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                : "bg-[#18181b] text-zinc-500 hover:bg-[#27272a] hover:text-white"
              }`}
            >
              {ws.name.substring(0, 2).toUpperCase()}
            </button>
          ))}
          <button 
            onClick={() => {
              workspaceForm.reset();
              setView("workspace_setup");
            }}
            className="w-11 h-11 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 transition-all duration-300"
          >
            <Plus size={22} />
          </button>
        </aside>
      )}

      {/* 2차 사이드바 */}
      {view === "main" && (
        <aside className="w-64 border-r border-[#27272a] bg-[#18181b] flex flex-col shrink-0 z-10">
          <div className="p-5 border-b border-[#27272a] flex items-center space-x-3 text-zinc-400 hover:text-white cursor-pointer transition-all active:scale-95">
            <Search size={18} />
            <span className="text-sm font-black tracking-tight">{t.sidebar.date_search}</span>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-8">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                  {t.sidebar.inbox}
                </h3>
                <div className="p-8 border-2 border-dashed border-[#27272a] bg-[#09090b]/40 rounded-2xl text-center">
                  <p className="text-[11px] text-zinc-600 font-bold italic">{t.sidebar.no_tasks}</p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-5 border-t border-[#27272a]">
            <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-[#27272a] space-x-4 h-12 px-4 rounded-xl transition-all">
              <Settings size={20} />
              <span className="font-bold text-sm">{t.sidebar.settings}</span>
            </Button>
          </div>
        </aside>
      )}

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#09090b] antialiased">
        {view === "main" ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-2">
             <h2 className="text-3xl font-black text-zinc-800 tracking-tighter uppercase italic drop-shadow-sm">Timeline Section</h2>
             <p className="text-zinc-600 font-black text-sm uppercase tracking-widest">Sprint 6 Implementation</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            {/* Onboarding Dialog */}
            <Dialog open={view === "onboarding"}>
              <DialogContent className="sm:max-w-[425px] bg-[#18181b] border-[#27272a] text-white shadow-2xl [&>button]:hidden rounded-2xl p-8 border-t-zinc-700/50">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-black tracking-tighter text-white">{t.onboarding.title}</DialogTitle>
                  <DialogDescription className="text-zinc-400 font-bold text-sm leading-relaxed">{t.onboarding.description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-8 mt-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.onboarding.nickname_label}</Label>
                    <Input {...userForm.register("nickname")} placeholder={t.onboarding.nickname_placeholder} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold focus:ring-1 focus:ring-white/10" />
                    {userForm.formState.errors.nickname && (
                      <p className="text-[11px] text-red-400 font-bold flex items-center gap-1"><AlertCircle size={12}/> {userForm.formState.errors.nickname.message}</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.onboarding.api_key_label}</Label>
                    <Input type="password" {...userForm.register("gemini_api_key")} placeholder={t.onboarding.api_key_placeholder} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold focus:ring-1 focus:ring-white/10" />
                    <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">{t.onboarding.api_key_guide}</p>
                  </div>
                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-black h-14 rounded-xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95">
                    {t.onboarding.submit_btn}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Workspace Setup Dialog */}
            <Dialog open={view === "workspace_setup"}>
              <DialogContent className="sm:max-w-[550px] bg-[#18181b] border-[#27272a] text-white shadow-2xl max-h-[90vh] flex flex-col [&>button]:hidden rounded-2xl p-0 border-t-zinc-700/50 overflow-hidden">
                <DialogHeader className="p-8 pb-4 space-y-3">
                  <DialogTitle className="text-3xl font-black tracking-tighter text-white">
                    {workspaces.length === 0 ? t.workspace_setup.title_first : t.workspace_setup.title_new}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 font-bold text-sm leading-relaxed">{t.workspace_setup.description}</DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 px-8">
                  <form id="ws-form" onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-10 py-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.workspace_setup.name_label}</Label>
                      <Input {...workspaceForm.register("name")} placeholder={t.workspace_setup.name_placeholder} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold" />
                      {workspaceForm.formState.errors.name && (
                        <p className="text-[11px] text-red-400 font-bold flex items-center gap-1"><AlertCircle size={12}/> {workspaceForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.workspace_setup.core_time}</Label>
                      <div className="grid grid-cols-2 gap-6">
                        <Input type="time" {...workspaceForm.register("core_time_start")} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                        <Input type="time" {...workspaceForm.register("core_time_end")} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                      </div>
                      {workspaceForm.formState.errors.core_time_end && (
                        <p className="text-[11px] text-red-400 font-bold flex items-center gap-1"><AlertCircle size={12}/> {workspaceForm.formState.errors.core_time_end.message}</p>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.workspace_setup.unplugged_time}</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            append({ label: "", start_time: "12:00", end_time: "13:00" });
                          }} 
                          className="border-[#27272a] bg-[#09090b] hover:bg-[#27272a] text-zinc-200 font-black rounded-lg h-9"
                        >
                          <Plus size={16} className="mr-2" /> {t.workspace_setup.add_unplugged}
                        </Button>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold italic">{t.workspace_setup.unplugged_guide}</p>
                      
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <div key={field.id} className="p-5 bg-[#09090b]/60 border border-[#27272a] rounded-2xl space-y-5 relative animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-zinc-600 tracking-widest uppercase">Block #{index + 1}</span>
                              <button type="button" onClick={() => remove(index)} className="text-zinc-600 hover:text-red-400 transition-colors active:scale-75">
                                <X size={16} />
                              </button>
                            </div>
                            <div className="space-y-2">
                                <Input {...workspaceForm.register(`unplugged_times.${index}.label` as const)} placeholder="Label (e.g. Lunch)" className="bg-[#18181b] border-[#27272a] h-11 rounded-xl px-4" />
                                {workspaceForm.formState.errors.unplugged_times?.[index]?.label && (
                                    <p className="text-[10px] text-red-400 font-bold pl-1">{workspaceForm.formState.errors.unplugged_times[index]?.label?.message}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.start_time` as const)} className="bg-[#18181b] border-[#27272a] h-11 rounded-xl [color-scheme:dark]" />
                              <div className="space-y-1">
                                <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.end_time` as const)} className="bg-[#18181b] border-[#27272a] h-11 rounded-xl [color-scheme:dark]" />
                                {workspaceForm.formState.errors.unplugged_times?.[index]?.end_time && (
                                    <p className="text-[10px] text-red-400 font-bold pl-1">{workspaceForm.formState.errors.unplugged_times[index]?.end_time?.message}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-[#27272a]" />

                    <div className="space-y-3">
                      <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.workspace_setup.role_intro}</Label>
                      <textarea 
                        {...workspaceForm.register("role_intro")}
                        placeholder={t.workspace_setup.role_placeholder}
                        className="w-full min-h-[140px] bg-[#09090b] border-[#27272a] rounded-2xl p-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-zinc-700 font-bold leading-relaxed shadow-inner"
                      />
                    </div>
                  </form>
                </ScrollArea>

                <DialogFooter className="p-8 pt-6 border-t border-[#27272a] bg-[#18181b]">
                  <Button type="submit" form="ws-form" className="w-full bg-white text-black hover:bg-zinc-200 font-black h-16 rounded-xl text-xl transition-all shadow-2xl shadow-black/40 active:scale-95">
                    {t.workspace_setup.submit_btn}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
