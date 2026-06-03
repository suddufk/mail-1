import { Button, Tooltip as HeroTooltip } from '@heroui/react';
import { Copy, MoreVertical, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  accountAdd,
  accountDelete,
  accountList,
  accountSetAsTop,
} from '@/api/account';
import { hasPerm } from '@/lib/permissions';
import { isEmail } from '@/lib/utils';
import { notifyError, notifySuccess } from '@/lib/notify';
import { useAppStore } from '@/store/app-store';
import type { Account } from '@/types';
import ConfirmButton from '@/components/ConfirmButton';
import { HeroSelectField } from '@/components/HeroFormControls';

const Tooltip = HeroTooltip as any;

export default function AccountSwitcher({ variant = 'compact' }: { variant?: 'compact' | 'panel' }) {
  const { t } = useTranslation();
  const settings = useAppStore((state) => state.settings);
  const domainList = useAppStore((state) => state.domainList);
  const currentAccountId = useAppStore((state) => state.currentAccountId);
  const setCurrentAccount = useAppStore((state) => state.setCurrentAccount);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [emailPrefix, setEmailPrefix] = useState('');
  const [suffix, setSuffix] = useState(domainList[0] || '');

  async function refresh() {
    if (!hasPerm('account:query')) return;
    setLoading(true);
    try {
      const list = (await accountList(0, 30, null)) as any[];
      setAccounts(list || []);
      if (list?.length && !currentAccountId) setCurrentAccount(list[0]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!suffix && domainList.length) setSuffix(domainList[0]);
  }, [domainList, suffix]);

  async function add() {
    const email = `${emailPrefix}${suffix}`;
    if (!emailPrefix || !isEmail(email)) {
      notifyError(t('notEmailMsg'));
      return;
    }
    const account = (await accountAdd(email, '')) as Account;
    setAccounts((items) => [...items, account]);
    setCurrentAccount(account);
    setEmailPrefix('');
    setShowAdd(false);
    notifySuccess(t('addSuccessMsg'));
    window.dispatchEvent(new Event('mail-web:accounts-changed'));
  }

  async function copy(email: string) {
    await navigator.clipboard.writeText(email);
    notifySuccess(t('copySuccessMsg'));
  }

  if (settings.manyEmail !== 0 && !accounts.length) return null;

  const isPanel = variant === 'panel';

  return (
    <div className={isPanel ? '' : 'px-4'}>
      <div className="mb-2 flex items-center justify-between px-2 text-sm text-muted">
        <span>{isPanel ? t('mailManagement') : t('emailAccount')}</span>
        <div className="flex items-center gap-1">
          {hasPerm('account:add') ? (
            <button className="icon-button size-8" onClick={() => setShowAdd((open) => !open)} type="button">
              <Plus className="size-4" />
            </button>
          ) : null}
          <button className="icon-button size-8" onClick={refresh} type="button">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showAdd ? (
        <div className="mb-3 rounded-2xl bg-surface-secondary p-3">
          <div className="flex overflow-hidden rounded-xl border border-border bg-field">
            <input
              className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
              onChange={(event) => setEmailPrefix(event.target.value)}
              placeholder={t('emailAccount')}
              value={emailPrefix}
            />
            <HeroSelectField
              className="w-[130px] shrink-0"
              onChange={setSuffix}
              options={domainList.map((domain) => ({ label: domain, value: domain }))}
              placeholder="@"
              triggerClassName="h-full rounded-none border-0 bg-transparent px-2 text-sm shadow-none"
              value={suffix}
            />
          </div>
          <Button className="mt-2 w-full" size="sm" onPress={add}>
            {t('add')}
          </Button>
        </div>
      ) : null}

      <div className={`${isPanel ? 'max-h-[calc(100vh-310px)]' : 'max-h-48'} space-y-2 overflow-auto pr-1`}>
        {accounts.map((account, index) => (
          <div
            className={`w-full rounded-2xl p-3 text-left transition ${
              currentAccountId === account.accountId ? 'bg-surface-secondary' : 'hover:bg-surface'
            }`}
            key={account.accountId}
            onClick={() => setCurrentAccount(account)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setCurrentAccount(account);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-sm font-semibold">{account.name || account.email}</div>
              <div className="flex shrink-0 items-center gap-1">
                <Tooltip content={t('copySuccessMsg')}>
                  <button
                    className="icon-button size-7"
                    onClick={(event) => {
                      event.stopPropagation();
                      copy(account.email);
                    }}
                    type="button"
                  >
                    <Copy className="size-4" />
                  </button>
                </Tooltip>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-xs text-muted">{account.email}</div>
              <div className="flex shrink-0">
                {index > 0 ? (
                  <button
                    className="icon-button size-7"
                    onClick={(event) => {
                      event.stopPropagation();
                      accountSetAsTop(account.accountId).then(() => {
                        refresh();
                        window.dispatchEvent(new Event('mail-web:accounts-changed'));
                      });
                    }}
                    type="button"
                  >
                    <Star className="size-4" />
                  </button>
                ) : null}
                {hasPerm('account:delete') ? (
                  <ConfirmButton
                    className="icon-button size-7"
                    description={t('deleteAccountAddressConfirmDescription', { email: account.email })}
                    isIconOnly
                    onConfirm={async () => {
                      await accountDelete(account.accountId);
                      notifySuccess(t('delSuccessMsg'));
                      refresh();
                      window.dispatchEvent(new Event('mail-web:accounts-changed'));
                    }}
                    size="sm"
                    title={t('deleteAccountAddressConfirmTitle')}
                    variant="tertiary"
                  >
                    <Trash2 className="size-4" />
                  </ConfirmButton>
                ) : (
                  <MoreVertical className="size-4 text-muted" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
