import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
      <Label className="text-xs font-bold text-text-secondary ml-1">
        {t.main.transition.section_delay}
      </Label>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center bg-background border border-border rounded-2xl px-4 h-12 focus-within:ring-1 focus-within:ring-accent transition-all">
          <Input
            type="number"
            value={customDelay}
            onChange={(e) => setCustomDelay(parseInt(e.target.value) || 0)}
            className="w-12 bg-transparent border-none text-center font-bold focus-visible:ring-0 p-0 text-sm"
          />
          <span className="text-xs font-bold text-text-muted ml-2">{t.main.mins}</span>
        </div>
        <Button
          variant="outline"
          onClick={handleDelay}
          className="flex-[2] border-border bg-background hover:bg-border text-text-primary font-bold h-12 rounded-2xl active:scale-95 text-sm transition-all"
        >
          {t.main.transition.delay_button.replace("{min}", customDelay.toString())}
        </Button>
      </div>
    </div>
  );
};
