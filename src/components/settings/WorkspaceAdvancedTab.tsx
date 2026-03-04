import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkspaceAdvancedTabProps {
  setIsDeleteConfirmOpen: (open: boolean) => void;
  t: any;
}

export const WorkspaceAdvancedTab = ({ setIsDeleteConfirmOpen, t }: WorkspaceAdvancedTabProps) => {
  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6 pb-6 pt-2">
        <div className="space-y-4">
          <Label className="text-xs font-bold text-danger uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={14} />
            Danger Zone
          </Label>
          <div className="p-6 border border-danger/30 bg-danger/5 rounded-2xl space-y-4 shadow-inner">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-text-primary">
                {t.sidebar.workspace_delete_confirm_title}
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t.sidebar.workspace_delete_desc}
              </p>
            </div>
            <Button 
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="w-full bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 font-bold h-12 rounded-xl transition-all active:scale-95"
            >
              {t.sidebar.workspace_delete_btn}
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
