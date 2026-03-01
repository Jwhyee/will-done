import { cn } from "@/lib/utils";

interface CompletionOptionProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export const CompletionOption = ({ active, onClick, icon, label }: CompletionOptionProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg transition-all",
        active
          ? "bg-surface-elevated text-text-primary shadow-sm border border-border"
          : "text-text-muted hover:text-text-secondary hover:bg-surface"
      )}
    >
      <div className={cn("transition-transform duration-200", active ? "scale-110 text-accent" : "")}>
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-tight leading-tight text-center">
        {label}
      </span>
    </button>
  );
};
