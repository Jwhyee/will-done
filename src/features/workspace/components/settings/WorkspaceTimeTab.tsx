import { Plus, X } from "lucide-react";
import { UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkspaceTimeTabProps {
  register: UseFormRegister<any>;
  fields: any[];
  append: (data: any) => void;
  remove: (index: number) => void;
  t: any;
}

export const WorkspaceTimeTab = ({ register, fields, append, remove, t }: WorkspaceTimeTabProps) => {
  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6 pb-6 pt-2">
        <div className="space-y-4">
          <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.core_time}</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input type="time" {...register("coreTimeStart")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium [color-scheme:dark] focus:ring-1 focus:ring-white/10" />
            <Input type="time" {...register("coreTimeEnd")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium [color-scheme:dark] focus:ring-1 focus:ring-white/10" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.workspace_setup.unplugged_time}</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => append({ label: "", startTime: "12:00", endTime: "13:00" })} 
              className="border-border bg-surface hover:bg-border text-text-secondary font-bold rounded-lg h-8 px-3"
            >
              <Plus size={14} className="mr-2" /> {t.workspace_setup.add_unplugged}
            </Button>
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 bg-surface border border-border rounded-xl space-y-3 relative">
                <button type="button" onClick={() => remove(index)} className="absolute top-3 right-3 text-text-muted hover:text-danger transition-colors">
                  <X size={14} />
                </button>
                <Input {...register(`unpluggedTimes.${index}.label` as const)} placeholder={t.workspace_setup.unplugged_label_placeholder} className="bg-background border-border h-10 rounded-lg px-3 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="time" {...register(`unpluggedTimes.${index}.startTime` as const)} className="bg-background border-border h-10 rounded-lg text-sm [color-scheme:dark]" />
                  <Input type="time" {...register(`unpluggedTimes.${index}.endTime` as const)} className="bg-background border-border h-10 rounded-lg text-sm [color-scheme:dark]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
