import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Settings, Search, X } from "lucide-react";

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

// --- Validation Schemas ---
const userSchema = z.object({
  nickname: z.string().min(1, "Required").max(20),
  gemini_api_key: z.string().optional(),
});

const workspaceSchema = z.object({
  name: z.string().min(1, "Required"),
  core_time_start: z.string().optional(),
  core_time_end: z.string().optional(),
  role_intro: z.string().optional(),
  unplugged_times: z.array(z.object({
    label: z.string().min(1, "Required"),
    start_time: z.string().min(1, "Required"),
    end_time: z.string().min(1, "Required"),
  })),
});

type UserFormValues = z.infer<typeof userSchema>;
type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

function App() {
  const [view, setView] = useState<"loading" | "onboarding" | "workspace_setup" | "main">("loading");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

  const lang = useMemo(() => getLang(), []);
  const t = translations[lang];

  // Forms
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
    },
    mode: "onChange" // 상태 변경 즉시 반영
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
      setView("main");
    } catch (error) {
      console.error("Workspace creation failed:", error);
    }
  };

  if (view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
        <p className="animate-pulse font-medium">{t.checking}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex overflow-hidden font-sans antialiased">
      
      {/* 1차 사이드바 */}
      {view === "main" && (
        <aside className="w-16 border-r border-[#27272a] bg-[#09090b] flex flex-col items-center py-4 space-y-4 shrink-0">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspaceId(ws.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                activeWorkspaceId === ws.id 
                ? "bg-white text-black scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                : "bg-[#18181b] text-zinc-400 hover:bg-[#27272a] hover:text-white"
              }`}
            >
              {ws.name.substring(0, 2).toUpperCase()}
            </button>
          ))}
          <button 
            onClick={() => setView("workspace_setup")}
            className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
          >
            <Plus size={20} />
          </button>
        </aside>
      )}

      {/* 2차 사이드바 */}
      {view === "main" && (
        <aside className="w-64 border-r border-[#27272a] bg-[#18181b] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#27272a] flex items-center space-x-2 text-zinc-400 hover:text-white cursor-pointer transition-colors">
            <Search size={16} />
            <span className="text-sm font-semibold">{t.sidebar.date_search}</span>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.1em]">
                  {t.sidebar.inbox}
                </h3>
                <div className="p-6 border border-[#27272a] bg-[#09090b]/50 rounded-xl text-center">
                  <p className="text-xs text-zinc-500 font-medium">{t.sidebar.no_tasks}</p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-[#27272a]">
            <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-[#27272a] space-x-3 h-11 px-3">
              <Settings size={18} />
              <span className="font-semibold text-sm">{t.sidebar.settings}</span>
            </Button>
          </div>
        </aside>
      )}

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#09090b]">
        {view === "main" ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center">
             <h2 className="text-2xl font-black text-zinc-800 tracking-tighter uppercase italic">Timeline Section</h2>
             <p className="text-zinc-600 font-bold mt-2">Sprint 6 Implementation Area</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            {/* Onboarding Dialog */}
            <Dialog open={view === "onboarding"}>
              <DialogContent className="sm:max-w-[425px] bg-[#18181b] border-[#27272a] text-white shadow-2xl [&>button]:hidden">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold tracking-tight text-white">{t.onboarding.title}</DialogTitle>
                  <DialogDescription className="text-zinc-400 font-medium">{t.onboarding.description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-zinc-200">{t.onboarding.nickname_label}</Label>
                    <Input {...userForm.register("nickname")} placeholder={t.onboarding.nickname_placeholder} className="bg-[#09090b] border-[#27272a] text-white h-11 focus:ring-1 focus:ring-white/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-zinc-200">{t.onboarding.api_key_label}</Label>
                    <Input type="password" {...userForm.register("gemini_api_key")} placeholder={t.onboarding.api_key_placeholder} className="bg-[#09090b] border-[#27272a] text-white h-11 focus:ring-1 focus:ring-white/20" />
                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{t.onboarding.api_key_guide}</p>
                  </div>
                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-black h-11 transition-all">
                    {t.onboarding.submit_btn}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Workspace Setup Dialog */}
            <Dialog open={view === "workspace_setup"}>
              <DialogContent className="sm:max-w-[550px] bg-[#18181b] border-[#27272a] text-white shadow-2xl max-h-[90vh] flex flex-col [&>button]:hidden">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold tracking-tight text-white">{t.workspace_setup.title}</DialogTitle>
                  <DialogDescription className="text-zinc-400 font-medium">{t.workspace_setup.description}</DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 pr-4 -mr-4">
                  <form id="ws-form" onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-8 py-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-zinc-200">{t.workspace_setup.name_label}</Label>
                      <Input {...workspaceForm.register("name")} placeholder={t.workspace_setup.name_placeholder} className="bg-[#09090b] border-[#27272a] text-white h-11" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-zinc-200">{t.workspace_setup.core_time} - Start</Label>
                        <Input type="time" {...workspaceForm.register("core_time_start")} className="bg-[#09090b] border-[#27272a] text-white h-11 [color-scheme:dark]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-zinc-200">{t.workspace_setup.core_time} - End</Label>
                        <Input type="time" {...workspaceForm.register("core_time_end")} className="bg-[#09090b] border-[#27272a] text-white h-11 [color-scheme:dark]" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-bold text-zinc-200">{t.workspace_setup.unplugged_time}</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.preventDefault(); // 폼 제출 방지
                            append({ label: "", start_time: "12:00", end_time: "13:00" });
                          }} 
                          className="border-[#27272a] bg-[#09090b] hover:bg-[#27272a] text-zinc-300 font-bold"
                        >
                          <Plus size={16} className="mr-2" /> {t.workspace_setup.add_unplugged}
                        </Button>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium">{t.workspace_setup.unplugged_guide}</p>
                      
                      <div className="space-y-3">
                        {fields.map((field, index) => (
                          <div key={field.id} className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-4 relative animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-zinc-600 uppercase">Block #{index + 1}</span>
                              <button type="button" onClick={() => remove(index)} className="text-zinc-600 hover:text-red-400 transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                            <Input {...workspaceForm.register(`unplugged_times.${index}.label` as const)} placeholder="Label (e.g. Lunch)" className="bg-[#18181b] border-[#27272a] h-10" />
                            <div className="grid grid-cols-2 gap-4">
                              <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.start_time` as const)} className="bg-[#18181b] border-[#27272a] h-10 [color-scheme:dark]" />
                              <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.end_time` as const)} className="bg-[#18181b] border-[#27272a] h-10 [color-scheme:dark]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-[#27272a]" />

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-zinc-200">{t.workspace_setup.role_intro}</Label>
                      <textarea 
                        {...workspaceForm.register("role_intro")}
                        placeholder={t.workspace_setup.role_placeholder}
                        className="w-full min-h-[120px] bg-[#09090b] border-[#27272a] rounded-xl p-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 placeholder:text-zinc-600 font-medium"
                      />
                    </div>
                  </form>
                </ScrollArea>

                <DialogFooter className="mt-6 pt-6 border-t border-[#27272a]">
                  <Button type="submit" form="ws-form" className="w-full bg-white text-black hover:bg-zinc-200 font-black h-12 text-base transition-all">
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
