import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { TimelineEntry } from "../types";
import { Clock, GripVertical, CheckCircle2, Flame, Ban, Plus } from "lucide-react";
import dayjs from "dayjs";

interface TimelineBoardProps {
  entries: TimelineEntry[];
  onReorder?: (reorderedEntries: TimelineEntry[]) => void;
}

export function TimelineBoard({ entries, onReorder }: TimelineBoardProps) {
  const [localEntries, setLocalEntries] = useState<TimelineEntry[]>(entries);
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newEntries = Array.from(localEntries);
    const [removed] = newEntries.splice(sourceIndex, 1);
    newEntries.splice(destinationIndex, 0, removed);

    setLocalEntries(newEntries);
    if (onReorder) {
      onReorder(newEntries);
    }
  };

  const calculateProgress = (start: string, end: string) => {
    const now = currentTime;
    const startTime = dayjs(`${now.format("YYYY-MM-DD")}T${start}`);
    const endTime = dayjs(`${now.format("YYYY-MM-DD")}T${end}`);
    
    if (now.isBefore(startTime)) return 0;
    if (now.isAfter(endTime)) return 100;
    
    const total = endTime.diff(startTime);
    const current = now.diff(startTime);
    return (current / total) * 100;
  };

  const renderEntry = (entry: TimelineEntry, index: number) => {
    const isUnplugged = entry.item_type === "unplugged";
    const status = isUnplugged ? "Unplugged" : entry.status;
    const title = entry.title || entry.label || "Untitled";
    const isDraggable = status === "Will";

    let baseClasses = "flex items-center gap-4 p-5 rounded-xl border transition-all relative overflow-hidden group";
    let statusIcon = null;

    switch (status) {
      case "Done":
        baseClasses += " bg-zinc-900/40 border-green-900/30 text-zinc-400";
        statusIcon = <CheckCircle2 className="w-5 h-5 text-green-500/50" />;
        break;
      case "Now":
        baseClasses += " bg-zinc-900 border-zinc-700 shadow-[0_0_25px_rgba(239,68,68,0.05)] text-zinc-50 scale-[1.01] ring-1 ring-red-500/20";
        statusIcon = <Flame className="w-5 h-5 text-red-500 animate-pulse" />;
        break;
      case "Will":
        baseClasses += " bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700";
        statusIcon = <Clock className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />;
        break;
      case "Unplugged":
        baseClasses += " bg-zinc-950 border-zinc-900 text-zinc-500 cursor-not-allowed";
        statusIcon = <Ban className="w-5 h-5 text-zinc-700" />;
        break;
    }

    const progress = status === "Now" ? calculateProgress(entry.start_time, entry.end_time) : 0;

    const content = (
      <div className={baseClasses}>
        {isUnplugged && (
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 2px, transparent 12px)' }}>
          </div>
        )}
        
        {status === "Now" && (
          <>
            <div 
              className="absolute left-0 top-0 bottom-0 bg-red-500/10 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-20 transition-all duration-1000"
              style={{ left: `${progress}%` }}
            />
          </>
        )}
        
        <div className="flex flex-col items-end min-w-[65px] font-mono text-sm z-10">
          <span className={status === "Now" ? "text-red-400 font-bold" : "text-zinc-500"}>
            {entry.start_time}
          </span>
          <span className="text-zinc-700 text-xs">
            {entry.end_time}
          </span>
        </div>

        <div className="w-px h-10 bg-zinc-800/50 mx-1 z-10"></div>

        <div className="flex-grow flex items-center gap-4 z-10">
          <div className="flex-shrink-0">
            {statusIcon}
          </div>
          <span className={`font-medium tracking-tight ${status === "Done" ? "line-through opacity-50" : ""}`}>
            {title}
          </span>
        </div>

        {isDraggable && (
          <div className="text-zinc-700 group-hover:text-zinc-500 transition-colors p-1 z-10">
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
              className="mb-3 outline-none"
              style={{
                ...provided.draggableProps.style,
                opacity: snapshot.isDragging ? 0.9 : 1,
                transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.02)` : provided.draggableProps.style?.transform,
              }}
            >
              {content}
            </div>
          )}
        </Draggable>
      );
    }

    return (
      <div key={`${entry.item_type}-${entry.id}`} className="mb-3">
        {content}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
            <Clock className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-200">Today's Timeline</h2>
        </div>
        <div className="text-xs font-mono text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800/50">
          {localEntries.length} Items
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="timeline-entries">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-1"
            >
              {localEntries.map((entry, index) => renderEntry(entry, index))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      {localEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border-2 border-dashed border-zinc-900 rounded-2xl bg-zinc-950/50">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
            <Plus className="w-6 h-6 text-zinc-700" />
          </div>
          <p className="font-medium text-zinc-400">No tasks scheduled for today</p>
          <p className="text-sm text-zinc-600 mt-1">Add your first task above to get started</p>
        </div>
      )}
    </div>
  );
}
