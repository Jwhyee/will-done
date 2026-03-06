import { TimeBlock } from "@/types";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateDropPosition = (
  activeId: string,
  overId: string,
  timeline: TimeBlock[],
  currentTime: Date,
  t: any
): ValidationResult => {
  // 1. Basic check
  if (activeId === overId) return { isValid: true };

  const activeBlock = timeline.find((b) => b.id.toString() === activeId);
  const overBlock = timeline.find((b) => b.id.toString() === overId);

  if (!activeBlock) return { isValid: false };
  
  // 2. Prevent dragging Unplugged/Done/Now
  if (activeBlock.status === "UNPLUGGED") {
    return { isValid: false, error: t.main.toast.unplugged_drag_error || "고정된 시간은 이동할 수 없습니다." };
  }
  if (activeBlock.status === "DONE") {
    return { isValid: false, error: t.main.toast.done_drag_error || "완료된 업무는 이동할 수 없습니다." };
  }

  if (!overBlock) return { isValid: true }; // Dragging to empty area (DroppableArea)

  // 3. Unplugged logic
  if (overBlock.status === "UNPLUGGED") {
    // If the user is dragging OVER an unplugged block, 
    // we want to allow it IF it would land before or after.
    // However, dnd-kit SortableContext by default will swap them.
    // To implement "magnetic snap", we might need to check the drop position relative to the block.
    // For now, let's keep it simple: if it's Unplugged, we can't "replace" it, 
    // but the final onDragEnd will decide the final position.
    // The user's requirement: "언플러그드 타임 주변(이전/이후) 이동 시 에러 수정"
    // "언플러그드 타임 내부로는 이동 불가"
    
    // Actually, in onDragEnd, we should check if the final index 
    // would result in the active block being at the same position as an unplugged block.
    // But unplugged blocks are usually fixed in their time slots.
    
    // Let's allow onDragOver to happen (for visual feedback), 
    // but validate strictly in onDragEnd.
    return { isValid: true }; 
  }

  // 4. Past time validation
  const nowIndex = timeline.findIndex(b => b.status === "NOW");
  const overIndex = timeline.findIndex(b => b.id.toString() === overId);
  
  if (activeBlock.status !== "NOW") {
    // If there is a NOW block, you can't move anything before it
    if (nowIndex !== -1 && overIndex <= nowIndex) {
      return { isValid: false, error: t.main.toast.past_time_error };
    }
    // If no NOW block, check if overBlock starts in the past
    if (nowIndex === -1 && new Date(overBlock.startTime) < currentTime) {
      return { isValid: false, error: t.main.toast.past_time_error };
    }
  }

  return { isValid: true };
};
