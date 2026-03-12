import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QuotaExhaustedModalProps {
    t: any;
    isOpen: boolean;
    onClose: () => void;
    onRetry: () => void;
}

export const QuotaExhaustedModal = ({
    t,
    isOpen,
    onClose,
    onRetry,
}: QuotaExhaustedModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[440px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-6 antialiased">
                <DialogHeader className="space-y-3">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-2">
                        <span className="text-2xl">⏳</span>
                    </div>
                    <DialogTitle className="text-xl font-black tracking-tighter text-text-primary">
                        {t.retrospective.quota_exhausted.title}
                    </DialogTitle>
                    <DialogDescription className="text-text-secondary text-sm font-medium leading-relaxed">
                        {t.retrospective.quota_exhausted.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="pt-6 flex flex-col gap-2">
                    <Button
                        onClick={onRetry}
                        className="w-full bg-accent text-text-primary hover:bg-accent/80 font-bold h-12 rounded-2xl transition-all active:scale-[0.98]"
                    >
                        {t.retrospective.quota_exhausted.retry_btn}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full text-text-secondary hover:bg-border/50 font-bold h-12 rounded-2xl transition-all"
                    >
                        {t.retrospective.quota_exhausted.close_btn}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
