import { Calendar as CalendarIcon, Copy, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Retrospective } from "@/types";
import { DateSelector } from "./DateSelector";

interface BrowseTabContentProps {
  browseInputValue: string;
  setBrowseInputValue: (val: string) => void;
  activeDates: string[];
  foundRetro: Retrospective | null;
  isCopied: boolean;
  handleCopy: (content: string) => void;
  t: any;
}

export const BrowseTabContent = ({
  browseInputValue,
  setBrowseInputValue,
  activeDates,
  foundRetro,
  isCopied,
  handleCopy,
  t
}: BrowseTabContentProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-black tracking-tighter text-text-primary leading-none">
          {t.retrospective.browse_title}
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          {t.retrospective.browse_desc}
        </p>
      </div>

      <div className="p-6 bg-surface border border-border rounded-2xl space-y-6 shadow-xl relative">
        <DateSelector
          value={browseInputValue}
          onChange={setBrowseInputValue}
          activeDates={activeDates}
        />
      </div>

      <AnimatePresence mode="wait">
        {foundRetro ? (
          <motion.div
            key={foundRetro.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 bg-surface rounded-3xl border border-border shadow-xl space-y-6"
          >
            <div className="flex justify-between items-start pb-6 border-b border-border/50">
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-text-primary tracking-tight leading-none">
                  {foundRetro.dateLabel}
                </h2>
                {foundRetro.usedModel && (
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-widest">
                    Engine: {foundRetro.usedModel.replace('models/', '').toUpperCase()}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-xl hover:bg-primary/10 transition-all active:scale-90"
                onClick={() => handleCopy(foundRetro.content)}
              >
                {isCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </Button>
            </div>

            <div className="prose prose-invert max-w-none prose-p:text-sm prose-p:leading-relaxed prose-p:text-text-secondary prose-headings:font-black prose-headings:tracking-tighter prose-headings:text-text-primary prose-strong:text-primary prose-code:text-warning prose-code:bg-warning/5 prose-code:px-1 prose-code:rounded prose-ul:space-y-2 prose-li:text-text-secondary prose-li:text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{foundRetro.content}</ReactMarkdown>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-surface/30 backdrop-blur-sm"
          >
            <div className="w-16 h-16 rounded-2xl bg-border/20 flex items-center justify-center text-text-secondary transition-transform hover:scale-105 duration-500">
              <CalendarIcon size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-lg text-text-primary font-bold tracking-tight">
                {t.retrospective.no_data_for_label}
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {t.retrospective.select_another_range}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
