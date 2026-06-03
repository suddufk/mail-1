import { Menu } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import Composer from '@/components/Composer';
import { useAppStore } from '@/store/app-store';

export default function WorkspaceLayout({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  return (
    <div
      className="mail-shell mail-shell--workspace"
      data-sidebar-collapsed={sidebarCollapsed}
    >
      <div className="sidebar-backdrop" data-open={sidebarOpen} onClick={() => setSidebarOpen(false)} />
      <AppSidebar />
      <main className="h-screen min-w-0 overflow-auto bg-background">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-separator bg-background/90 px-6 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button className="icon-button sidebar-open-button" onClick={() => setSidebarOpen(true)} type="button">
              <Menu className="size-5" />
            </button>
            <h1 className="truncate text-2xl font-semibold">{title}</h1>
          </div>
          {actions}
        </header>
        <div className="min-w-0 p-6">{children}</div>
      </main>
      <Composer />
    </div>
  );
}
