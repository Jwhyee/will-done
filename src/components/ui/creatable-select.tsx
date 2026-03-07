import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export function CreatableSelect({
  value,
  onChange,
  placeholder,
  fetchCommand,
  className
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  fetchCommand: string;
  className?: string;
}) {
  const [options, setOptions] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await invoke<any[]>(fetchCommand);
        setOptions(data);
      } catch (err) {
        console.error("Failed to fetch options", err);
      }
    };
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen, fetchCommand]);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const handleSelect = (val: string) => {
    setInputValue(val);
    onChange(val);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(inputValue);
    }
  };

  const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className={`flex items-center justify-between px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-accent ${className || ""}`}>
          <span className={inputValue ? "text-text-primary" : "text-text-muted truncate pr-2 max-w-[150px]"}>
            {inputValue || placeholder}
          </span>
          <ChevronDown size={14} className="text-text-secondary opacity-50 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0 bg-surface-elevated border-border rounded-xl shadow-xl" align="start">
        <div className="p-2 border-b border-border">
          <Input 
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)} 
            onKeyDown={handleKeyDown}
            placeholder={placeholder} 
            className="h-8 text-sm bg-surface border-border"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          <button 
            type="button"
            className="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-surface text-text-secondary italic flex items-center justify-between"
            onClick={() => handleSelect("")}
          >
            None
            {inputValue === "" && <Check size={14} className="text-text-primary" />}
          </button>
          
          {filteredOptions.length === 0 && inputValue !== "" && (
            <button 
              type="button"
              className="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-surface text-text-primary flex items-center justify-between"
              onClick={() => handleSelect(inputValue)}
            >
              <span className="truncate pr-2">Create "{inputValue}"</span>
            </button>
          )}

          {filteredOptions.map((opt) => (
            <button 
              key={opt.id}
              type="button"
              className="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-surface text-text-primary flex items-center justify-between"
              onClick={() => handleSelect(opt.name)}
            >
              <span className="truncate pr-2">{opt.name}</span>
              {inputValue === opt.name && <Check size={14} className="text-text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}