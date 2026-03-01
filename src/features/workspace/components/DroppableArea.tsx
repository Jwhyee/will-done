import React from 'react';
import { useDroppable } from "@dnd-kit/core";

export const DroppableArea = ({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'ring-2 ring-blue-500/50 rounded-xl' : ''}`}>
      {children}
    </div>
  );
};
