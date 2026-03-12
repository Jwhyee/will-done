import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DuplicateConfirmModalProps {
    t: any;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const DuplicateConfirmModal = ({
    t,
    isOpen,
    onClose,
    onConfirm,
}: DuplicateConfirmModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[440px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-6 antialiased">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="text-xl font-black tracking-tighter text-text-primary">
                        📝 {t.retrospective.duplicate_confirm_title}
                    </DialogTitle>
                    <DialogDescription className="text-text-secondary text-sm font-medium leading-relaxed">
                        {t.retrospective.duplicate_confirm_desc}
                    </DialogDescription>
                </DialogHeader>

                <div className="pt-6 flex flex-col gap-2">
                    <Button
                        onClick={onConfirm}
                        className="w-full bg-accent text-text-primary hover:bg-accent/80 font-bold h-12 rounded-2xl transition-all active:scale-[0.98]"
                    >
                        {t.retrospective.generate_btn}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full text-text-secondary hover:bg-border/50 font-bold h-12 rounded-2xl transition-all"
                    >
                        {t.common.cancel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
