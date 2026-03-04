import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { translations, getLang } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

interface UpdaterContextType {
  checking: boolean;
  update: Update | null;
  checkForUpdates: () => Promise<void>;
}

const UpdaterContext = createContext<UpdaterContextType | undefined>(undefined);

export const UpdaterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  const [updating, setUpdating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const lang = getLang();
  const t = translations[lang].updater;

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      const manifest = await check();
      if (manifest) {
        setUpdate(manifest);
        setDialogOpen(true);
      }
    } catch (error) {
      // Log more context but avoid showing disruptive alerts for background update checks
      if (error instanceof Error && error.message.includes("fetch")) {
        console.warn("Updater: Remote manifest not found or inaccessible (likely draft release or offline).");
      } else {
        console.error("Updater: Failed to check for updates:", error);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleUpdate = async () => {
    if (!update) return;

    try {
      setUpdating(true);
      await update.downloadAndInstall();
      // After install, we need to relaunch
      await relaunch();
    } catch (error) {
      console.error("Update failed:", error);
      alert(t.update_error);
      setUpdating(false);
    }
  };

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates();
  }, []);

  return (
    <UpdaterContext.Provider value={{ checking, update, checkForUpdates }}>
      {children}

      <Dialog open={dialogOpen} onOpenChange={updating ? undefined : setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.new_version}</DialogTitle>
            <DialogDescription>
              {update && t.update_query.replace("{version}", update.version)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            {!updating && (
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t.later_btn}
              </Button>
            )}
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.updating}
                </>
              ) : (
                t.update_btn
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UpdaterContext.Provider>
  );
};

export const useUpdater = () => {
  const context = useContext(UpdaterContext);
  if (context === undefined) {
    throw new Error("useUpdater must be used within an UpdaterProvider");
  }
  return context;
};
