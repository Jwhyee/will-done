import { GripVertical, Clock, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Task } from "@/types";

interface InboxItemProps {
  task: Task;
  onMoveToTimeline: (id: number) => void;
  onDelete: (id: number) => void;
}

export const InboxItem = ({ task, onMoveToTimeline, onDelete }: InboxItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `inbox-${task.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? 1.05 : 1,
    boxShadow: isDragging ? "0 10px 20px rgba(0,0,0,0.5)" : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="p-4 bg-surface/60 border border-border rounded-2xl group transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0">
            <GripVertical size={14} className="text-text-muted group-hover:text-text-secondary" />
          </div>
          <h4 className="font-bold text-xs text-text-secondary truncate">{task.title}</h4>
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onMoveToTimeline(task.id);
            }}
            className="h-8 w-8 p-0 rounded-xl bg-surface-elevated text-text-muted hover:text-text-primary hover:bg-border"
          >
            <Clock size={14} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="h-8 w-8 p-0 rounded-xl bg-surface-elevated text-text-muted hover:text-danger hover:bg-danger/20"
          >
            <X size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};
