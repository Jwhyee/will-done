import { useForm } from "react-hook-form";
import { Plus, Clock, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TimePicker } from "./TimePicker";

interface RecurringTaskFormProps {
  t: any;
  onSubmit: (data: any) => Promise<void>;
}

export const RecurringTaskForm = ({ t, onSubmit }: RecurringTaskFormProps) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: "",
      hours: 0,
      minutes: 30,
      planningMemo: "",
      daysOfWeek: [] as number[],
    }
  });

  const selectedDays = watch("daysOfWeek");
  const hours = watch("hours");
  const minutes = watch("minutes");

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setValue("daysOfWeek", selectedDays.filter(d => d !== day));
    } else {
      setValue("daysOfWeek", [...selectedDays, day].sort());
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (data.daysOfWeek.length === 0) return;

    const duration = (data.hours * 60) + parseInt(data.minutes.toString());
    await onSubmit({
      title: data.title,
      duration,
      planningMemo: data.planningMemo || null,
      daysOfWeek: data.daysOfWeek,
    });
    reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Prevent submitting if title is empty or no days selected
      handleSubmit(handleFormSubmit)();
    }
  };

  const days = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun

  return (
    <div className="space-y-6 p-6 bg-surface border border-border rounded-2xl shadow-sm">
      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
            <FileText size={12} />
            {t.workspace_routine.title_label}
          </Label>
          <Input
            {...register("title", { required: true })}
            placeholder={t.main.task_placeholder}
            onKeyDown={handleKeyDown}
            className="bg-background border-border h-12 rounded-xl px-4 font-medium focus:ring-1 focus:ring-white/10"
          />
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
            <Clock size={12} />
            {t.workspace_routine.duration_label}
          </Label>
          <div className="flex items-center gap-3">
            <TimePicker
              hours={hours}
              minutes={minutes}
              onChange={(h, m) => {
                setValue("hours", h);
                setValue("minutes", m);
              }}
              t={t}
            />
          </div>
        </div>

        {/* Days of Week */}
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
            <CalendarDays size={12} />
            {t.workspace_routine.days_label}
          </Label>
          <div className="flex justify-between gap-1">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "flex-1 h-10 rounded-lg text-xs font-bold transition-all border",
                  selectedDays.includes(day)
                    ? "bg-text-primary text-background border-text-primary shadow-lg shadow-black/10"
                    : "bg-background text-text-secondary border-border hover:border-border/80"
                )}
              >
                {t.workspace_routine.days[day]}
              </button>
            ))}
          </div>
        </div>

        {/* Planning Memo */}
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            {t.workspace_routine.planning_label}
          </Label>
          <textarea
            {...register("planningMemo")}
            placeholder={t.main.planning_placeholder}
            className="w-full min-h-[100px] bg-background border border-border rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-text-muted font-medium leading-relaxed resize-none"
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={() => handleSubmit(handleFormSubmit)()}
        disabled={isSubmitting || selectedDays.length === 0}
        className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95 disabled:opacity-50"
      >
        <Plus size={16} className="mr-2" />
        {t.workspace_routine?.add_btn || "Add Routine"}
      </Button>
    </div>
  );
};
