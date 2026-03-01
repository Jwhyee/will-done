import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';

interface MainLayoutProps {
  children: ReactNode;
  sidebar1: ReactNode;
  sidebar2?: (isCollapsed: boolean, setIsCollapsed: (val: boolean) => void) => ReactNode;
}

export const MainLayout = ({ children, sidebar1, sidebar2 }: MainLayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="h-screen bg-background text-text-primary flex overflow-hidden font-sans antialiased select-none">
      {sidebar1}
      
      {sidebar2 && (
        <motion.div
          initial={false}
          animate={{ width: isCollapsed ? 80 : 256 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="border-r border-border bg-surface flex flex-col shrink-0 z-10 relative"
        >
          {sidebar2(isCollapsed, setIsCollapsed)}
        </motion.div>
      )}

      <main className="flex-1 flex flex-col relative overflow-hidden bg-background antialiased">
        {children}
      </main>
    </div>
  );
};
