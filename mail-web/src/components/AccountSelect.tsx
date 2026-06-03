import { ListBox, Select } from '@heroui/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { accountList } from '@/api/account';
import { hasPerm } from '@/lib/permissions';
import { useAppStore } from '@/store/app-store';
import type { Account } from '@/types';

export default function AccountSelect() {
  const { t } = useTranslation();
  const user = useAppStore((state) => state.user);
  const currentAccountId = useAppStore((state) => state.currentAccountId);
  const setCurrentAccount = useAppStore((state) => state.setCurrentAccount);
  const [accounts, setAccounts] = useState<Account[]>([]);

  async function refresh() {
    if (!hasPerm('account:query')) return;
    const list = ((await accountList(0, 30, null).catch(() => [])) || []) as Account[];
    setAccounts(list);
    if (list.length && !list.some((account) => account.accountId === currentAccountId)) {
      setCurrentAccount(list[0]);
    }
  }

  useEffect(() => {
    refresh();
  }, [currentAccountId]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('mail-web:accounts-changed', handler);
    return () => window.removeEventListener('mail-web:accounts-changed', handler);
  }, [currentAccountId]);

  if (!accounts.length) {
    return <div className="truncate text-sm text-muted">{user.email}</div>;
  }

  return (
    <Select
      className="account-select w-full"
      onChange={(key) => {
        const accountId = Number(Array.isArray(key) ? key[0] : key);
        const account = accounts.find((item) => item.accountId === accountId);
        if (account) setCurrentAccount(account);
      }}
      placeholder={t('emailAccount')}
      value={currentAccountId ? String(currentAccountId) : null}
      variant="secondary"
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {accounts.map((account) => (
            <ListBox.Item id={String(account.accountId)} key={account.accountId} textValue={account.email}>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{account.name || account.email}</div>
                <div className="truncate text-xs text-muted">{account.email}</div>
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
