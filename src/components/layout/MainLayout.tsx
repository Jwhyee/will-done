import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
  sidebar1: ReactNode;
}

export const MainLayout = ({ children, sidebar1 }: MainLayoutProps) => {
  return (
    <div className="h-screen bg-background text-text-primary flex overflow-hidden font-sans antialiased select-none">
      {sidebar1}
      
      <main className="flex-1 flex flex-col relative overflow-hidden bg-background antialiased">
        {children}
      </main>
    </div>
  );
};
