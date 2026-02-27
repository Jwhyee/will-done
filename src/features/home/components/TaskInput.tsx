import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Flame, Plus, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

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

  const isFormValid = title.trim() && (typeof hours === "number" || typeof minutes === "number") && ((typeof hours === "number" ? hours : 0) * 60 + (typeof minutes === "number" ? minutes : 0) > 0);

  return (
    <Card className="bg-zinc-900 border-zinc-800 shadow-xl mb-10 overflow-hidden ring-1 ring-white/5">
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-4">
            <div className="flex-grow min-w-[280px]">
              <Input
                placeholder="What's the next goal?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-zinc-700 h-14 text-lg font-medium rounded-xl"
                required
              />
            </div>
            
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 h-14 focus-within:ring-1 focus-within:ring-zinc-700 transition-all">
              <input
                type="number"
                min="0"
                max="23"
                placeholder="0"
                value={hours}
                onChange={(e) => setHours(e.target.value ? parseInt(e.target.value) : "")}
                className="w-8 bg-transparent text-zinc-50 text-center focus:outline-none placeholder:text-zinc-700 font-mono text-lg"
              />
              <span className="text-zinc-600 font-mono text-sm uppercase">h</span>
              <div className="w-px h-4 bg-zinc-800 mx-1"></div>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="30"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value ? parseInt(e.target.value) : "")}
                className="w-8 bg-transparent text-zinc-50 text-center focus:outline-none placeholder:text-zinc-700 font-mono text-lg"
              />
              <span className="text-zinc-600 font-mono text-sm uppercase">m</span>
            </div>

            <label className={`
              flex items-center gap-3 cursor-pointer h-14 px-4 rounded-xl border transition-all select-none
              ${isUrgent 
                ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-400'}
            `}>
              <div className="relative flex items-center justify-center w-5 h-5">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border border-zinc-700 rounded-md bg-zinc-900 checked:bg-red-500 checked:border-red-500 transition-all cursor-pointer"
                />
                {isUrgent && <Flame className="absolute w-3.5 h-3.5 text-white pointer-events-none" />}
              </div>
              <span className="text-sm font-bold tracking-tight uppercase">
                Urgent
              </span>
            </label>

            <Button 
              type="submit" 
              disabled={isSubmitting || !isFormValid}
              className={`
                h-14 px-8 font-bold rounded-xl transition-all duration-300
                ${isFormValid 
                  ? 'bg-zinc-50 text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-white/5' 
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
              `}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2 stroke-[3]" />
                  Add Task
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setIsMemoExpanded(!isMemoExpanded)}
              className={`
                flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors w-fit px-2 py-1 rounded
                ${isMemoExpanded ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600 hover:text-zinc-400'}
              `}
            >
              {isMemoExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {isMemoExpanded ? "Hide Planning Memo" : "Add Planning Memo"}
            </button>

            <AnimatePresence>
              {isMemoExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    <div className="relative group">
                      <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="Write specific steps, references, or goals to complete this task. Markdown is supported."
                        className="w-full min-h-[180px] p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-none font-mono text-sm leading-relaxed"
                      />
                      <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-100 transition-opacity">
                        <Info className="w-4 h-4 text-zinc-500" />
                      </div>
                    </div>
                    <div className="w-full min-h-[180px] p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/50 text-zinc-400 overflow-y-auto prose prose-invert prose-sm max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-400 prose-strong:text-zinc-300 prose-code:text-zinc-300 prose-code:bg-zinc-900 prose-code:px-1 prose-code:rounded prose-ul:list-disc prose-ol:list-decimal">
                      {memo ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {memo}
                        </ReactMarkdown>
                      ) : (
                        <div className="h-full flex items-center justify-center text-zinc-700 italic text-sm">
                          Markdown preview will appear here
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
