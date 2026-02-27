import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Settings, Search } from "lucide-react";

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

// --- Components ---

function App() {
  const [view, setView] = useState<"loading" | "onboarding" | "workspace_setup" | "main">("loading");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

  const lang = useMemo(() => getLang(), []);
  const t = translations[lang];

  // Forms
  const userForm = useForm<UserFormValues>({ resolver: zodResolver(userSchema) });
  const workspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { unplugged_times: [] },
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
      // await invoke<any>("get_user"); // Not used in this view yet

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
    const id = await invoke<number>("create_workspace", { input: data });
    const wsList = await invoke<any[]>("get_workspaces");
    setWorkspaces(wsList);
    setActiveWorkspaceId(id);
    setView("main");
  };

  if (view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
        <p className="animate-pulse">{t.checking}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex overflow-hidden font-sans">
      
      {/* 1차 사이드바 (워크스페이스 스위처) */}
      {view === "main" && (
        <aside className="w-16 border-r border-[#27272a] bg-[#09090b] flex flex-col items-center py-4 space-y-4">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspaceId(ws.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                activeWorkspaceId === ws.id 
                ? "bg-primary text-primary-foreground scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                : "bg-[#18181b] text-muted-foreground hover:bg-[#27272a]"
              }`}
            >
              {ws.name.substring(0, 2).toUpperCase()}
            </button>
          ))}
          <button 
            onClick={() => setView("workspace_setup")}
            className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
          >
            <Plus size={20} />
          </button>
        </aside>
      )}

      {/* 2차 사이드바 (워크스페이스 컨텍스트) */}
      {view === "main" && (
        <aside className="w-64 border-r border-[#27272a] bg-[#18181b] flex flex-col">
          <div className="p-4 border-b border-[#27272a] flex items-center space-x-2 text-muted-foreground">
            <Search size={16} />
            <span className="text-sm font-medium">{t.sidebar.date_search}</span>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t.sidebar.inbox}
                </h3>
                <div className="p-8 border-2 border-dashed border-[#27272a] rounded-lg text-center">
                  <p className="text-xs text-muted-foreground italic">{t.sidebar.no_tasks}</p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-[#27272a]">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white hover:bg-[#27272a] space-x-2">
              <Settings size={18} />
              <span>{t.sidebar.settings}</span>
            </Button>
          </div>
        </aside>
      )}

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {view === "main" ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center">
             <h2 className="text-2xl font-bold opacity-50">Timeline coming in Sprint 6</h2>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 animate-in fade-in duration-700">
            {/* Onboarding Dialog (Global Profile) */}
            <Dialog open={view === "onboarding"}>
              <DialogContent className="sm:max-w-[425px] bg-[#18181b] border-[#27272a] text-white">
                <DialogHeader>
                  <DialogTitle>{t.onboarding.title}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">{t.onboarding.description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>{t.onboarding.nickname_label}</Label>
                    <Input {...userForm.register("nickname")} placeholder={t.onboarding.nickname_placeholder} className="bg-[#09090b] border-[#27272a]" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.onboarding.api_key_label}</Label>
                    <Input type="password" {...userForm.register("gemini_api_key")} placeholder={t.onboarding.api_key_placeholder} className="bg-[#09090b] border-[#27272a]" />
                    <p className="text-[0.65rem] text-muted-foreground">{t.onboarding.api_key_guide}</p>
                  </div>
                  <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 font-bold">{t.onboarding.submit_btn}</Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Workspace Setup Dialog */}
            <Dialog open={view === "workspace_setup"}>
              <DialogContent className="sm:max-w-[550px] bg-[#18181b] border-[#27272a] text-white max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{t.workspace_setup.title}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">{t.workspace_setup.description}</DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 pr-4">
                  <form id="ws-form" onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label>{t.workspace_setup.name_label}</Label>
                      <Input {...workspaceForm.register("name")} placeholder={t.workspace_setup.name_placeholder} className="bg-[#09090b] border-[#27272a]" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t.workspace_setup.core_time} - Start</Label>
                        <Input type="time" {...workspaceForm.register("core_time_start")} className="bg-[#09090b] border-[#27272a] [color-scheme:dark]" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.workspace_setup.core_time} - End</Label>
                        <Input type="time" {...workspaceForm.register("core_time_end")} className="bg-[#09090b] border-[#27272a] [color-scheme:dark]" />
                      </div>
                    </div>

                    <Separator className="bg-[#27272a]" />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>{t.workspace_setup.unplugged_time}</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ label: "", start_time: "12:00", end_time: "13:00" })} className="border-[#27272a] hover:bg-[#27272a]">
                          <Plus size={16} className="mr-2" /> {t.workspace_setup.add_unplugged}
                        </Button>
                      </div>
                      <p className="text-[0.7rem] text-muted-foreground">{t.workspace_setup.unplugged_guide}</p>
                      
                      {fields.map((field, index) => (
                        <div key={field.id} className="p-3 bg-[#09090b] border border-[#27272a] rounded-lg space-y-3">
                          <Input {...workspaceForm.register(`unplugged_times.${index}.label` as const)} placeholder="Label (e.g. Lunch)" className="bg-[#18181b] border-[#27272a]" />
                          <div className="grid grid-cols-2 gap-2">
                            <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.start_time` as const)} className="bg-[#18181b] border-[#27272a] [color-scheme:dark]" />
                            <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.end_time` as const)} className="bg-[#18181b] border-[#27272a] [color-scheme:dark]" />
                          </div>
                          <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} className="w-full text-xs h-7">Remove</Button>
                        </div>
                      ))}
                    </div>

                    <Separator className="bg-[#27272a]" />

                    <div className="space-y-2">
                      <Label>{t.workspace_setup.role_intro}</Label>
                      <textarea 
                        {...workspaceForm.register("role_intro")}
                        placeholder={t.workspace_setup.role_placeholder}
                        className="w-full min-h-[100px] bg-[#09090b] border-[#27272a] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </form>
                </ScrollArea>

                <DialogFooter className="mt-4 pt-4 border-t border-[#27272a]">
                  <Button type="submit" form="ws-form" className="w-full bg-white text-black hover:bg-white/90 font-bold">
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
