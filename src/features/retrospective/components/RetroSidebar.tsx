import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RetroSidebarProps {
  tab: "create" | "browse";
  setTab: (tab: "create" | "browse") => void;
  onClose: () => void;
  t: any;
}

export const RetroSidebar = ({ tab, setTab, onClose, t }: RetroSidebarProps) => {
  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 pt-8 pb-6 px-6 space-y-8 relative z-50">
      <Button
        variant="ghost"
        className="justify-start -ml-2 text-text-secondary hover:text-text-primary font-bold h-10 px-3 group transition-all"
        onClick={onClose}
      >
        <ChevronLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm">{t.sidebar.back}</span>
      </Button>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-text-primary leading-tight">
            {t.retrospective.title}
          </h2>
        </div>
        <nav className="space-y-1.5">
          {[
            { id: "create", label: t.retrospective.create_tab },
            { id: "browse", label: t.retrospective.browse_tab }
          ].map((item) => (
            <Button
              key={item.id}
              variant={tab === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-11 rounded-xl font-bold text-sm px-4 transition-all duration-300",
                tab === item.id ? "bg-primary/10 text-primary shadow-sm" : "text-text-secondary hover:translate-x-1"
              )}
              onClick={() => setTab(item.id as any)}
            >
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
    </aside>
  );
};
