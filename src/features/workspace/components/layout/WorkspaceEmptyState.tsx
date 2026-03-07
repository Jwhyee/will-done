import { Rocket, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkspaceEmptyStateProps {
  t: any;
  onCreateWorkspace: () => void;
}

export const WorkspaceEmptyState = ({ t, onCreateWorkspace }: WorkspaceEmptyStateProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-8 text-center space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-surface rounded-3xl flex items-center justify-center shadow-2xl border border-border/50">
        <Rocket size={48} className="text-text-primary animate-bounce" />
      </div>

      <div className="space-y-4 max-w-md">
        <h1 className="text-3xl font-black tracking-tighter text-text-primary leading-tight">
          {t.workspace_setup.welcome}
        </h1>
        <p className="text-lg font-medium text-text-secondary leading-relaxed whitespace-pre-line">
          {t.workspace_setup.empty_desc}
        </p>
      </div>

      <Button
        onClick={onCreateWorkspace}
        className="bg-text-primary text-background hover:bg-zinc-200 font-bold h-14 px-8 rounded-2xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95 flex items-center gap-2"
      >
        <Plus size={20} />
        {t.workspace_setup.create_btn}
      </Button>
    </div>
  );
};
