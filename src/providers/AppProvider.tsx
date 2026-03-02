import React, { ReactNode } from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "./ToastProvider";
import { UpdaterProvider } from "./UpdaterProvider";

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <TooltipProvider>
        <UpdaterProvider>
          {children}
        </UpdaterProvider>
      </TooltipProvider>
    </ToastProvider>
  );
};
