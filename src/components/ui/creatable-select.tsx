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
  className,
  noneLabel = "None",
  createLabel = (val) => `Create "${val}"`
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  fetchCommand: string;
  className?: string;
  noneLabel?: string;
  createLabel?: (val: string) => string;
}) {
  const [options, setOptions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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
      setSearchTerm("");
      fetchOptions();
    }
  }, [isOpen, fetchCommand]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(searchTerm || value);
    }
  };

  const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className={`flex items-center justify-between px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-accent w-full ${className || ""}`}>
          <span className={value ? "text-text-primary" : "text-text-muted truncate pr-2 max-w-[150px]"}>
            {value || placeholder}
          </span>
          <ChevronDown size={14} className="text-text-secondary opacity-50 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0 bg-surface-elevated border-border rounded-xl shadow-xl" align="start">
        <div className="p-2 border-b border-border">
          <Input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
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
            {noneLabel}
            {value === "" && <Check size={14} className="text-text-primary" />}
          </button>
          
          {searchTerm !== "" && !options.some(opt => opt.name.toLowerCase() === searchTerm.toLowerCase()) && (
            <button 
              type="button"
              className="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-surface text-text-primary flex items-center justify-between"
              onClick={() => handleSelect(searchTerm)}
            >
              <span className="truncate pr-2">{createLabel(searchTerm)}</span>
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
              {value === opt.name && <Check size={14} className="text-text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
