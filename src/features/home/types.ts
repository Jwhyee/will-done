export interface TimelineEntry {
  id: number;
  item_type: "task" | "unplugged";
  title?: string;
  label?: string;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  status?: "Will" | "Now" | "Done";
}
