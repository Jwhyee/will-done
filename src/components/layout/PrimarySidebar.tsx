import { Plus } from "lucide-react";
import { Workspace } from "@/types";

interface PrimarySidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: number | null;
  onSelectWorkspace: (id: number) => void;
  onAddWorkspace: () => void;
}

export const PrimarySidebar = ({ 
  workspaces, 
  activeWorkspaceId, 
  onSelectWorkspace, 
  onAddWorkspace 
}: PrimarySidebarProps) => {
  return (
    <aside className="w-16 border-r border-border bg-background flex flex-col items-center py-4 space-y-4 shrink-0 shadow-2xl z-20">
      {workspaces.map((ws) => (
        <button
          key={ws.id}
          onClick={() => onSelectWorkspace(ws.id)}
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 transform ${
            activeWorkspaceId === ws.id 
            ? "bg-text-primary text-background scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
            : "bg-surface-elevated text-text-muted hover:bg-border hover:text-text-primary"
          }`}
        >
          {ws.name.substring(0, 2).toUpperCase()}
        </button>
      ))}
      <button 
        onClick={onAddWorkspace}
        className="w-11 h-11 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-text-secondary transition-all duration-300"
      >
        <Plus size={22} />
      </button>
    </aside>
  );
};
