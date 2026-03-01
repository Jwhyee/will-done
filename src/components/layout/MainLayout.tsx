import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
  sidebar1: ReactNode;
  sidebar2?: ReactNode;
}

export const MainLayout = ({ children, sidebar1, sidebar2 }: MainLayoutProps) => {
  return (
    <div className="h-screen bg-background text-text-primary flex overflow-hidden font-sans antialiased select-none">
      {sidebar1}
      {sidebar2}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-background antialiased">
        {children}
      </main>
    </div>
  );
};
