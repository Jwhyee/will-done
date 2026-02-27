import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Flame, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TaskInputProps {
  workspaceId: number;
  onTaskAdded: () => void;
}

export function TaskInput({ workspaceId, onTaskAdded }: TaskInputProps) {
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState<number | "">("");
  const [minutes, setMinutes] = useState<number | "">("");
  const [memo, setMemo] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isMemoExpanded, setIsMemoExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const h = typeof hours === "number" ? hours : 0;
    const m = typeof minutes === "number" ? minutes : 0;
    const durationMinutes = h * 60 + m;

    if (durationMinutes <= 0) return;

    setIsSubmitting(true);
    try {
      await invoke("add_task", {
        workspaceId,
        title: title.trim(),
        planningMemo: memo.trim(),
        durationMinutes,
        isUrgent,
        targetDate: new Date().toISOString().split("T")[0], // Today's date
      });
      
      // Reset form
      setTitle("");
      setHours("");
      setMinutes("");
      setMemo("");
      setIsUrgent(false);
      setIsMemoExpanded(false);
      
      onTaskAdded();
    } catch (error) {
      console.error("Failed to add task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 shadow-lg mb-8 overflow-hidden">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="flex-grow min-w-[200px]">
              <Input
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-500 focus-visible:ring-zinc-700 h-12 text-lg"
                required
              />
            </div>
            
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-md px-3 h-12">
              <input
                type="number"
                min="0"
                max="23"
                placeholder="0"
                value={hours}
                onChange={(e) => setHours(e.target.value ? parseInt(e.target.value) : "")}
                className="w-10 bg-transparent text-zinc-50 text-center focus:outline-none placeholder:text-zinc-600 font-mono"
              />
              <span className="text-zinc-500 font-mono">h</span>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="30"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value ? parseInt(e.target.value) : "")}
                className="w-10 bg-transparent text-zinc-50 text-center focus:outline-none placeholder:text-zinc-600 font-mono"
              />
              <span className="text-zinc-500 font-mono">m</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer h-12 px-3 rounded-md border border-zinc-800 bg-zinc-950 hover:bg-zinc-800/50 transition-colors select-none">
              <div className="relative flex items-center justify-center w-5 h-5">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border border-zinc-700 rounded bg-zinc-900 checked:bg-red-500/20 checked:border-red-500 transition-all cursor-pointer"
                />
                {isUrgent && <Flame className="absolute w-3.5 h-3.5 text-red-500 pointer-events-none" />}
              </div>
              <span className={`text-sm font-medium transition-colors ${isUrgent ? 'text-red-400' : 'text-zinc-400'}`}>
                Urgent
              </span>
            </label>

            <Button 
              type="submit" 
              disabled={isSubmitting || !title.trim() || (hours === "" && minutes === "") || (hours === 0 && minutes === 0)}
              className="h-12 px-6 bg-zinc-50 text-zinc-950 hover:bg-zinc-200 font-semibold transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Task
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsMemoExpanded(!isMemoExpanded)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors w-fit"
            >
              {isMemoExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isMemoExpanded ? "Hide planning memo" : "Add planning memo (optional)"}
            </button>

            {isMemoExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Write specific steps, references, or goals to complete this task. Markdown is supported."
                  className="w-full min-h-[150px] p-3 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-y font-mono text-sm"
                />
                <div className="w-full min-h-[150px] p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50 text-zinc-300 overflow-y-auto max-w-none [&>h1]:text-xl [&>h1]:font-bold [&>h2]:text-lg [&>h2]:font-semibold [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>p]:mb-2 [&>a]:text-blue-400 [&>a]:underline">
                  {memo ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {memo}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-zinc-600 italic">Preview will appear here...</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
