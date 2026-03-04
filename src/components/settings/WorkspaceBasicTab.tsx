import { UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkspaceBasicTabProps {
  register: UseFormRegister<any>;
  t: any;
}

export const WorkspaceBasicTab = ({ register, t }: WorkspaceBasicTabProps) => {
  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6 pb-6 pt-2">
        <div className="space-y-3">
          <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">
            {t.workspace_setup.name_label}
          </Label>
          <Input 
            {...register("name")} 
            className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium focus:ring-1 focus:ring-white/10" 
          />
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">
            {t.workspace_setup.role_intro}
          </Label>
          <textarea 
            {...register("roleIntro")}
            placeholder={t.workspace_setup.role_placeholder}
            className="w-full min-h-[200px] bg-surface border border-border rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-text-muted font-medium leading-relaxed resize-none"
          />
        </div>
      </div>
    </ScrollArea>
  );
};
