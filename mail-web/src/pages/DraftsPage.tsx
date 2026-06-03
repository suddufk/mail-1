import { Button } from '@heroui/react';
import { Edit3, Menu, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppSidebar from '@/components/AppSidebar';
import Composer from '@/components/Composer';
import { getDb, type DraftRow } from '@/lib/db';
import { formatDetailDate } from '@/lib/utils';
import { notifySuccess } from '@/lib/notify';
import { useAppStore } from '@/store/app-store';
import ConfirmButton from '@/components/ConfirmButton';

export default function DraftsPage() {
  const { t } = useTranslation();
  const user = useAppStore((state) => state.user);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const openComposer = useAppStore((state) => state.openComposer);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);

  async function refresh() {
    const list = await getDb(user.email).draft.orderBy('createTime').reverse().toArray();
    setDrafts(list);
  }

  useEffect(() => {
    refresh();
  }, [user.email]);

  async function remove(draftId?: number) {
    if (!draftId) return;
    await getDb(user.email).draft.delete(draftId);
    notifySuccess(t('delSuccessMsg'));
    refresh();
  }

  return (
    <div
      className="mail-shell mail-shell--workspace"
      data-sidebar-collapsed={sidebarCollapsed}
    >
      <div className="sidebar-backdrop" data-open={sidebarOpen} onClick={() => setSidebarOpen(false)} />
      <AppSidebar />
      <main className="h-screen overflow-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="icon-button sidebar-open-button" onClick={() => setSidebarOpen(true)} type="button">
              <Menu className="size-5" />
            </button>
            <h1 className="text-2xl font-semibold">{t('drafts')}</h1>
          </div>
          <Button onPress={() => openComposer({ mode: 'new' })}>{t('newEmail')}</Button>
        </div>
        <div className="surface-card overflow-hidden rounded-2xl">
          {drafts.length ? (
            drafts.map((draft) => (
              <div className="flex items-center gap-3 border-b border-separator p-4 last:border-0" key={draft.draftId}>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{draft.subject || t('subject')}</div>
                  <div className="truncate text-sm text-muted">{draft.receiveEmail?.join(', ')}</div>
                  <div className="text-xs text-muted">{formatDetailDate(draft.createTime)}</div>
                </div>
                <button className="icon-button" onClick={() => openComposer({ mode: 'draft', draft })} type="button">
                  <Edit3 className="size-5" />
                </button>
                <ConfirmButton
                  className="icon-button"
                  description={t('deleteDraftConfirmDescription')}
                  isIconOnly
                  onConfirm={() => remove(draft.draftId)}
                  title={t('deleteDraftConfirmTitle')}
                  variant="tertiary"
                >
                  <Trash2 className="size-5" />
                </ConfirmButton>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-muted">{t('noMessagesFound')}</div>
          )}
        </div>
      </main>
      <Composer />
    </div>
  );
}
