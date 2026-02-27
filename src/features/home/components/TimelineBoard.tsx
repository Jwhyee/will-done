import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { TimelineEntry } from "../types";
import { Clock, GripVertical, CheckCircle2, Flame } from "lucide-react";

interface TimelineBoardProps {
  entries: TimelineEntry[];
  onReorder?: (reorderedEntries: TimelineEntry[]) => void;
}

export function TimelineBoard({ entries, onReorder }: TimelineBoardProps) {
  const [localEntries, setLocalEntries] = useState<TimelineEntry[]>(entries);

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Only "Will" tasks are draggable, so we need to map the indices back to the full array
    const willEntries = localEntries.filter(e => e.status === "Will");
    const otherEntries = localEntries.filter(e => e.status !== "Will");

    const reorderedWill = Array.from(willEntries);
    const [removed] = reorderedWill.splice(sourceIndex, 1);
    reorderedWill.splice(destinationIndex, 0, removed);

    // Reconstruct the full array (keeping the original order of non-Will items)
    // This is a simplified approach. In a real app, you'd likely send the new order to the backend.
    const newEntries = [...otherEntries, ...reorderedWill].sort((a, b) => {
      // Sort by start time to maintain timeline order
      return a.start_time.localeCompare(b.start_time);
    });

    setLocalEntries(newEntries);
    if (onReorder) {
      onReorder(newEntries);
    }
  };

  const renderEntry = (entry: TimelineEntry, index: number, isDraggable: boolean = false) => {
    const isUnplugged = entry.item_type === "unplugged";
    const status = isUnplugged ? "Unplugged" : entry.status;
    const title = entry.title || entry.label || "Untitled";

    let baseClasses = "flex items-center gap-4 p-4 rounded-lg border transition-all mb-3 relative overflow-hidden";
    let statusIcon = null;

    switch (status) {
      case "Done":
        baseClasses += " bg-green-950/20 border-green-900/50 text-zinc-300";
        statusIcon = <CheckCircle2 className="w-5 h-5 text-green-500" />;
        break;
      case "Now":
        baseClasses += " bg-zinc-900 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] text-zinc-50 scale-[1.02] z-10";
        statusIcon = <Flame className="w-5 h-5 text-red-500 animate-pulse" />;
        break;
      case "Will":
        baseClasses += " bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700";
        break;
      case "Unplugged":
        baseClasses += " border-zinc-800 text-zinc-500";
        break;
    }

    const content = (
      <div className={baseClasses}>
        {isUnplugged && (
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 8px)' }}>
          </div>
        )}
        
        <div className="flex flex-col items-end min-w-[60px] font-mono text-sm z-10">
          <span className={status === "Now" ? "text-red-400 font-bold" : "text-zinc-400"}>{entry.start_time}</span>
          <span className="text-zinc-600 text-xs">{entry.end_time}</span>
        </div>

        <div className="w-px h-10 bg-zinc-800 mx-2 z-10"></div>

        <div className="flex-grow flex items-center gap-3 z-10">
          {statusIcon}
          <span className={`font-medium ${status === "Done" ? "line-through opacity-70" : ""}`}>
            {title}
          </span>
        </div>

        {isDraggable && (
          <div className="text-zinc-600 cursor-grab active:cursor-grabbing p-2 z-10">
            <GripVertical className="w-5 h-5" />
          </div>
        )}
      </div>
    );

    if (isDraggable) {
      return (
        <Draggable key={entry.id.toString()} draggableId={entry.id.toString()} index={index}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={{
                ...provided.draggableProps.style,
                opacity: snapshot.isDragging ? 0.8 : 1,
              }}
            >
              {content}
            </div>
          )}
        </Draggable>
      );
    }

    return <div key={entry.id}>{content}</div>;
  };

  const nowEntry = localEntries.find(e => e.status === "Now" && e.item_type !== "unplugged");
  const willEntries = localEntries.filter(e => e.status === "Will" && e.item_type !== "unplugged");
  // Combine all entries in chronological order for display, but we only make "Will" draggable
  // Actually, the prompt says "drag-and-drop reordering for 'Will' tasks".
  // It's better to display them in a single timeline list.
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6 text-zinc-400">
        <Clock className="w-5 h-5" />
        <h2 className="text-lg font-medium">Today's Timeline</h2>
      </div>

      <div className="space-y-1">
        {/* Render past/done items */}
        {localEntries.filter(e => e.status === "Done" || (e.item_type === "unplugged" && e.start_time < (nowEntry?.start_time || "24:00"))).map((entry, i) => 
          renderEntry(entry, i, false)
        )}

        {/* Render current item */}
        {nowEntry && renderEntry(nowEntry, 0, false)}

        {/* Render future items (Will) with drag and drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="will-tasks">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="min-h-[50px]"
              >
                {willEntries.map((entry, index) => renderEntry(entry, index, true))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Render future unplugged items */}
        {localEntries.filter(e => e.item_type === "unplugged" && e.start_time >= (nowEntry?.start_time || "00:00")).map((entry, i) => 
          renderEntry(entry, i, false)
        )}
      </div>
      
      {localEntries.length === 0 && (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
          No tasks scheduled for today. Add one above to get started.
        </div>
      )}
    </div>
  );
}
