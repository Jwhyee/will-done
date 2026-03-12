import { useState, useEffect } from "react";
import { workspaceApi } from "@/features/workspace/api";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/providers/ToastProvider";
import { Project } from "@/types";

export const ProjectManagementTab = ({ t }: { t: any }) => {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const fetchProjects = async () => {
    try {
      const data = await workspaceApi.getProjects();
      setProjects(data);
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    try {
      await workspaceApi.createProject({ name: newProjectName.trim() });
      setNewProjectName("");
      fetchProjects();
      showToast(t.project_label.project_created, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await workspaceApi.updateProject(id, { name: editName.trim() });
      setEditingId(null);
      fetchProjects();
      showToast(t.project_label.project_updated, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await workspaceApi.deleteProject(id);
      fetchProjects();
      showToast(t.project_label.project_deleted, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-text-primary">{t.project_label.manage_projects}</h3>
        <p className="text-xs text-text-secondary">{t.project_label.manage_projects_desc}</p>
      </div>

      <div className="flex gap-2">
        <Input 
          value={newProjectName} 
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder={t.project_label.new_project_placeholder}
          className="bg-surface border-border text-text-primary flex-1"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
        />
        <Button onClick={(e) => { e.preventDefault(); handleCreate(); }} className="bg-text-primary text-background hover:bg-zinc-200">
          <Plus size={16} />
        </Button>
      </div>

      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
        {projects.map((project) => (
          <div key={project.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-surface group">
            {editingId === project.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-background border-border text-sm h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleUpdate(project.id); }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); handleUpdate(project.id); }} className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"><Check size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); setEditingId(null); }} className="h-8 w-8 text-text-secondary hover:text-text-primary"><X size={14} /></Button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-text-primary">{project.name}</span>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-text-secondary hover:text-text-primary" onClick={(e) => { e.preventDefault(); setEditingId(project.id); setEditName(project.name); }}>
                    <Edit2 size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10" onClick={(e) => { e.preventDefault(); handleDelete(project.id); }}>
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
