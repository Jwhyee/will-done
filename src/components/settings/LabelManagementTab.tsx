import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/providers/ToastProvider";
import { Label } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const GITHUB_COLORS = [
  "#b60205", "#d93f0b", "#fbca04", "#0e8a16", "#006b75", "#1d76db",
  "#0052cc", "#5319e7", "#e99695", "#f9d0c4", "#fef2c0", "#c2e0c6",
  "#bfdadc", "#c5def5", "#bfd4f2", "#d4c5f9", "#ffffff", "#000000"
];

const ColorPicker = ({ color, onChange }: { color: string, onChange: (c: string) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-10 h-10 p-0 border-border bg-surface shrink-0 relative overflow-hidden" onClick={(e) => e.preventDefault()}>
        <div className="absolute inset-0 m-1 rounded-sm" style={{ backgroundColor: color }} />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-64 p-3 bg-surface-elevated border-border shadow-2xl rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
      <div className="flex flex-wrap gap-2">
        {GITHUB_COLORS.map((c) => (
          <button
            key={c}
            className={`w-6 h-6 rounded-md border shadow-sm transition-transform hover:scale-110 active:scale-95 ${color === c ? 'ring-2 ring-text-primary ring-offset-1 ring-offset-surface-elevated' : 'border-border/50'}`}
            style={{ backgroundColor: c }}
            onClick={(e) => { e.preventDefault(); onChange(c); }}
          />
        ))}
      </div>
    </PopoverContent>
  </Popover>
);

export const LabelManagementTab = ({ t }: { t: any }) => {
  const { showToast } = useToast();
  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#1d76db");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const fetchLabels = async () => {
    try {
      const data = await invoke<Label[]>("get_labels");
      setLabels(data);
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleCreate = async () => {
    if (!newLabelName.trim()) return;
    try {
      await invoke("create_label", { input: { name: newLabelName.trim(), color: newLabelColor } });
      setNewLabelName("");
      fetchLabels();
      showToast(t.project_label.label_created, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await invoke("update_label", { id, input: { name: editName.trim(), color: editColor } });
      setEditingId(null);
      fetchLabels();
      showToast(t.project_label.label_updated, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await invoke("delete_label", { id });
      fetchLabels();
      showToast(t.project_label.label_deleted, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-text-primary">{t.project_label.manage_labels}</h3>
        <p className="text-xs text-text-secondary">{t.project_label.manage_labels_desc}</p>
      </div>

      <div className="flex gap-2">
        <ColorPicker color={newLabelColor} onChange={setNewLabelColor} />
        <Input 
          value={newLabelName} 
          onChange={(e) => setNewLabelName(e.target.value)}
          placeholder={t.project_label.new_label_placeholder}
          className="bg-surface border-border text-text-primary flex-1"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
        />
        <Button onClick={(e) => { e.preventDefault(); handleCreate(); }} className="bg-text-primary text-background hover:bg-zinc-200">
          <Plus size={16} />
        </Button>
      </div>

      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
        {labels.map((label) => (
          <div key={label.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-surface group">
            {editingId === label.id ? (
              <div className="flex flex-1 items-center gap-2">
                <ColorPicker color={editColor} onChange={setEditColor} />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-background border-border text-sm h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleUpdate(label.id); }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); handleUpdate(label.id); }} className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"><Check size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); setEditingId(null); }} className="h-8 w-8 text-text-secondary hover:text-text-primary"><X size={14} /></Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-border/50 shadow-sm" style={{ backgroundColor: label.color }} />
                  <span className="text-sm font-medium text-text-primary">{label.name}</span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-text-secondary hover:text-text-primary" onClick={(e) => { e.preventDefault(); setEditingId(label.id); setEditName(label.name); setEditColor(label.color); }}>
                    <Edit2 size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10" onClick={(e) => { e.preventDefault(); handleDelete(label.id); }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};