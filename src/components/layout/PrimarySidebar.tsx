import { Plus, Settings } from "lucide-react";
import { Workspace } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PrimarySidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: number | null;
  onSelectWorkspace: (id: number) => void;
  onAddWorkspace: () => void;
  onOpenSettings: () => void;
  onOpenWorkspaceSettings: (id: number) => void;
  t: any;
}

export const PrimarySidebar = ({ 
  workspaces, 
  activeWorkspaceId, 
  onSelectWorkspace, 
  onAddWorkspace,
  onOpenSettings,
  onOpenWorkspaceSettings,
  t
}: PrimarySidebarProps) => {
  return (
    <TooltipProvider delayDuration={0}>
      <aside className="w-14 border-r border-border bg-background flex flex-col items-center py-4 space-y-4 shrink-0 shadow-2xl z-20">
        <div className="flex-1 flex flex-col items-center space-y-4 w-full">
          {workspaces.map((ws) => (
            <div key={ws.id} className="relative group">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectWorkspace(ws.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 transform ${
                      activeWorkspaceId === ws.id 
                      ? "bg-text-primary text-background scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                      : "bg-surface-elevated text-text-muted hover:bg-border hover:text-text-primary"
                    }`}
                  >
                    {ws.name.substring(0, 2).toUpperCase()}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                  {ws.name}
                </TooltipContent>
              </Tooltip>

              {/* Workspace Settings Button (on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenWorkspaceSettings(ws.id);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-surface-elevated border border-border rounded-full flex items-center justify-center text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <Settings size={10} />
              </button>
            </div>
          ))}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={onAddWorkspace}
                className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-text-secondary transition-all duration-300"
              >
                <Plus size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
              {t.sidebar?.add_workspace || "워크스페이스 추가"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Global Settings at the bottom */}
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={onOpenSettings}
                className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-text-secondary transition-all duration-300"
              >
                <Settings size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
              {t.sidebar?.settings || "설정"}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
};
