import { AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface WorkspaceDialogsProps {
  t: any;
  userStartTime?: string;
  deleteTaskId: number | null;
  isSplitDelete: boolean;
  moveAllConfirm: boolean;
  exceededConfirm: { data: any } | null;
  onDeleteCancel: () => void;
  onDeleteConfirm: (id: number) => Promise<void>;
  onSplitDeleteConfirm: (id: number, keepPast: boolean) => Promise<void>;
  onMoveAllCancel: () => void;
  onMoveAllConfirm: () => Promise<void>;
  onExceededCancel: () => void;
  onExceededContinue: (data: any) => Promise<void>;
  onExceededToInbox: (data: any) => Promise<void>;
}

export const WorkspaceDialogs = ({
  t,
  userStartTime,
  deleteTaskId,
  isSplitDelete,
  moveAllConfirm,
  exceededConfirm,
  onDeleteCancel,
  onDeleteConfirm,
  onSplitDeleteConfirm,
  onMoveAllCancel,
  onMoveAllConfirm,
  onExceededCancel,
  onExceededContinue,
  onExceededToInbox,
}: WorkspaceDialogsProps) => {
  return (
    <>
      {/* Deletion Confirmation */}
      <Dialog
        open={!!deleteTaskId}
        onOpenChange={(open) => {
          if (!open) onDeleteCancel();
        }}
      >
        <DialogContent className="sm:max-w-[420px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased">
          {isSplitDelete ? (
            <>
              <DialogHeader className="space-y-4">
                <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
                  <AlertCircle className="text-warning" size={20} />
                  {t.main.delete_split_confirm.title}
                </DialogTitle>
                <DialogDescription className="text-text-secondary text-sm leading-relaxed">
                  {t.main.delete_split_confirm.description}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  onClick={async () => {
                    if (deleteTaskId) await onSplitDeleteConfirm(deleteTaskId, false);
                  }}
                  className="w-full bg-danger text-text-primary hover:bg-danger/80 font-bold h-12 rounded-xl transition-all active:scale-95"
                >
                  {t.main.delete_split_confirm.delete_all}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (deleteTaskId) await onSplitDeleteConfirm(deleteTaskId, true);
                  }}
                  className="w-full bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold h-12 rounded-xl transition-all"
                >
                  {t.main.delete_split_confirm.keep_past}
                </Button>
                <Button
                  variant="ghost"
                  onClick={onDeleteCancel}
                  className="w-full text-text-muted hover:text-text-secondary font-medium h-10"
                >
                  {t.main.delete_split_confirm.cancel}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="space-y-4">
                <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
                  <AlertCircle className="text-danger" size={20} />
                  {t.main.delete_confirm.title}
                </DialogTitle>
                <DialogDescription className="text-text-secondary text-sm leading-relaxed">
                  {t.main.delete_confirm.description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-6 flex gap-3">
                <Button
                  variant="ghost"
                  onClick={onDeleteCancel}
                  className="flex-1 bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold rounded-xl h-12"
                >
                  {t.main.delete_confirm.cancel}
                </Button>
                <Button
                  onClick={async () => {
                    if (deleteTaskId) await onDeleteConfirm(deleteTaskId);
                  }}
                  className="flex-1 bg-danger text-text-primary hover:bg-danger/80 font-bold rounded-xl h-12 transition-all active:scale-95"
                >
                  {t.main.delete_confirm.btn}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Move All Confirmation */}
      <Dialog open={moveAllConfirm} onOpenChange={(open) => !open && onMoveAllCancel()}>
        <DialogContent className="sm:max-w-[400px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
              <Send className="text-accent" size={20} />
              {t.main.move_all.title}
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm leading-relaxed">
              {t.main.move_all.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <Button
              variant="ghost"
              onClick={onMoveAllCancel}
              className="flex-1 bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold rounded-xl"
            >
              {t.main.move_all.cancel}
            </Button>
            <Button
              onClick={onMoveAllConfirm}
              className="flex-1 bg-accent text-text-primary hover:bg-accent/80 font-bold rounded-xl"
            >
              {t.main.move_all.btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deadline Exceeded Confirmation */}
      <Dialog
        open={!!exceededConfirm}
        onOpenChange={(open) => !open && onExceededCancel()}
      >
        <DialogContent className="sm:max-w-[420px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
              <AlertCircle className="text-warning" size={20} />
              {t.main.deadline_exceeded.title}
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {t.main.deadline_exceeded.message.replace("{time}", userStartTime || "04:00")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={() => exceededConfirm && onExceededContinue(exceededConfirm.data)}
              className="w-full bg-accent text-text-primary hover:bg-accent/80 font-bold h-12 rounded-xl transition-all active:scale-95"
            >
              {t.main.deadline_exceeded.continue}
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                if (exceededConfirm) await onExceededToInbox(exceededConfirm.data);
              }}
              className="w-full bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold h-12 rounded-xl transition-all"
            >
              {t.main.deadline_exceeded.to_inbox}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
