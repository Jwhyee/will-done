import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ExtensionSectionProps {
  t: any;
  customDelay: number;
  setCustomDelay: (min: number) => void;
  handleDelay: () => Promise<void>;
}

export const ExtensionSection = ({
  t,
  customDelay,
  setCustomDelay,
  handleDelay,
}: ExtensionSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center bg-background border border-border rounded-xl px-4 h-11 focus-within:ring-1 focus-within:ring-accent transition-all">
          <Input
            type="number"
            min={1}
            value={customDelay}
            onChange={(e) => setCustomDelay(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-12 bg-transparent border-none text-center font-bold focus-visible:ring-0 p-0 text-sm"
          />
          <span className="text-xs font-bold text-text-muted ml-2">{t.main.mins}</span>
        </div>
        <Button
          onClick={handleDelay}
          className="flex-[2] bg-text-primary text-background hover:bg-text-primary/90 font-black h-11 rounded-xl active:scale-95 text-sm transition-all shadow-md"
        >
          {t.main.transition.delay_button.replace("{min}", customDelay.toString())}
        </Button>
      </div>
    </div>
  );
};
