import { Avatar, Button, Tooltip as HeroTooltip } from '@heroui/react';
import {
  Archive,
  BarChart3,
  FileText,
  Inbox,
  KeyRound,
  LogOut,
  Mail,
  Menu,
  Moon,
  PenLine,
  Send,
  Settings,
  Shield,
  Star,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '@/api/login';
import { hasPerm } from '@/lib/permissions';
import { initials } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import AccountSelect from '@/components/AccountSelect';

const Tooltip = HeroTooltip as any;

const avatarGradients = [
  'linear-gradient(135deg, #bae6fd 0%, #6ee7b7 48%, #a78bfa 100%)',
  'linear-gradient(135deg, #bfdbfe 0%, #60a5fa 44%, #4f46e5 100%)',
  'linear-gradient(135deg, #fde68a 0%, #fb923c 48%, #ef4444 100%)',
  'linear-gradient(135deg, #ccfbf1 0%, #22d3ee 44%, #3b82f6 100%)',
  'linear-gradient(135deg, #dcfce7 0%, #4ade80 45%, #059669 100%)',
  'linear-gradient(135deg, #e9d5ff 0%, #c084fc 44%, #db2777 100%)',
  'linear-gradient(135deg, #ffe4e6 0%, #fb7185 46%, #dc2626 100%)',
];

const primaryItems = [
  { path: '/inbox', key: 'inbox', icon: Inbox },
  { path: '/starred', key: 'starred', icon: Star },
  { path: '/sent', key: 'sent', icon: Send, perm: 'email:send' },
  { path: '/drafts', key: 'drafts', icon: FileText, perm: 'email:send' },
  { path: '/settings', key: 'settings', icon: Settings },
];

const adminItems = [
  { path: '/analysis', key: 'analytics', icon: BarChart3, perm: 'analysis:query' },
  { path: '/all-users', key: 'allUsers', icon: Users, perm: 'user:query' },
  { path: '/all-mail', key: 'allMail', icon: Archive, perm: 'all-email:query' },
  { path: '/role', key: 'permissions', icon: Shield, perm: 'role:query' },
  { path: '/invite-code', key: 'inviteCode', icon: KeyRound, perm: 'reg-key:query' },
  { path: '/system-setting', key: 'SystemSettings', icon: Settings, perm: 'setting:query' },
];

function NavItem({ item }: { item: any }) {
  const { t } = useTranslation();
  const user = useAppStore((state) => state.user);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const Icon = item.icon;
  const badge = getNavBadge(item.key, user);

  if (item.perm && !hasPerm(item.perm)) return null;

  return (
    <NavLink
      className={({ isActive }) =>
        `sidebar-nav-link mx-4 flex h-11 items-center justify-between rounded-2xl px-4 text-[15px] transition ${
          isActive ? 'bg-surface-secondary font-semibold text-foreground' : 'text-foreground/80 hover:bg-surface'
        }`
      }
      onClick={() => {
        if (window.innerWidth < 1024) setSidebarOpen(false);
      }}
      to={item.path}
    >
      <span className="sidebar-nav-content flex min-w-0 items-center gap-4">
        <Icon className="size-5 shrink-0" />
        <span className="sidebar-label truncate">{t(item.key)}</span>
      </span>
      {badge ? <span className="sidebar-badge text-sm text-muted">{badge}</span> : null}
      <span className="sr-only">{sidebarOpen ? 'open' : 'closed'}</span>
    </NavLink>
  );
}

function getNavBadge(key: string, user: Record<string, any>) {
  const candidates =
    key === 'inbox'
      ? [user.inboxCount, user.unreadCount, user.emailCount]
      : key === 'starred'
        ? [user.starCount, user.starredCount]
        : [];
  const value = candidates.find((item) => Number(item) > 0);
  return value ? Number(value) : null;
}

function avatarGradient(value?: string) {
  const code = [...(value || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarGradients[code % avatarGradients.length];
}

export default function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const currentAccount = useAppStore((state) => state.currentAccount);
  const dark = useAppStore((state) => state.dark);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const setDark = useAppStore((state) => state.setDark);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const setSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed);
  const openComposer = useAppStore((state) => state.openComposer);
  const resetSession = useAppStore((state) => state.resetSession);

  const visibleAdminItems = useMemo(
    () => adminItems.filter((item) => !item.perm || hasPerm(item.perm)),
    [user.permKeys],
  );

  async function handleLogout() {
    await logout().catch(() => null);
    localStorage.removeItem('token');
    resetSession();
    navigate('/login');
  }

  const accountIdentity = currentAccount?.email || user.email;
  const accountFallback = currentAccount?.name || accountIdentity;

  return (
    <aside
      className="mail-sidebar flex h-full flex-col"
      data-collapsed={sidebarCollapsed}
      data-open={sidebarOpen}
    >
      <div className="sidebar-header flex items-center justify-between px-6 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            className="sidebar-account-avatar size-12 text-foreground"
            style={{ background: avatarGradient(accountIdentity) }}
          >
            <Avatar.Fallback>{initials(accountFallback)}</Avatar.Fallback>
          </Avatar>
          <div className="sidebar-user-meta min-w-0">
            <AccountSelect />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="icon-button sidebar-collapse-button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            type="button"
          >
            <Menu className="size-5" />
          </button>
          <button
            aria-label={t('close')}
            className="icon-button sidebar-close-button"
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <nav className="mt-3 flex flex-col gap-1">
        {primaryItems.map((item) => (
          <NavItem item={item} key={item.path} />
        ))}
      </nav>

      {visibleAdminItems.length ? (
        <>
          <div className="sidebar-section-separator mx-6 my-5 h-px bg-separator" />
          <div className="sidebar-section-title mb-2 px-6 text-sm font-semibold text-muted">{t('manage')}</div>
          <nav className="flex flex-col gap-1">
            {visibleAdminItems.map((item) => (
              <NavItem item={item} key={item.path} />
            ))}
          </nav>
        </>
      ) : null}

      <div className="mt-auto space-y-3 p-6">
        <div className="sidebar-footer-actions flex items-center justify-between">
          <Tooltip content={dark ? 'Light' : 'Dark'}>
            <button className="icon-button" onClick={() => setDark(!dark)} type="button">
              {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
          </Tooltip>
          <Tooltip content={t('logOut')}>
            <button className="icon-button" onClick={handleLogout} type="button">
              <LogOut className="size-5" />
            </button>
          </Tooltip>
          <Tooltip content="Menu">
            <button
              className="icon-button sidebar-open-button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              type="button"
            >
              <Menu className="size-5" />
            </button>
          </Tooltip>
        </div>
        {hasPerm('email:send') ? (
          sidebarCollapsed ? (
            <Tooltip content={t('newEmail')}>
              <button className="icon-button mx-auto" onClick={() => openComposer({ mode: 'new' })} type="button">
                <PenLine className="size-5" />
              </button>
            </Tooltip>
          ) : (
            <Button className="w-full" onPress={() => openComposer({ mode: 'new' })}>
              <PenLine className="size-5" />
              {t('newEmail')}
            </Button>
          )
        ) : null}
      </div>
    </aside>
  );
}
