import { Button, ButtonGroup, Tabs } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resetPassword, userDelete } from '@/api/my';
import { notifyError, notifySuccess } from '@/lib/notify';
import AccountSwitcher from '@/components/AccountSwitcher';
import ConfirmButton from '@/components/ConfirmButton';
import { HeroSwitchField } from '@/components/HeroFormControls';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import { useAppStore } from '@/store/app-store';

export default function SettingsPage() {
  const { t } = useTranslation();
  const user = useAppStore((state) => state.user);
  const lang = useAppStore((state) => state.lang);
  const dark = useAppStore((state) => state.dark);
  const setLang = useAppStore((state) => state.setLang);
  const setDark = useAppStore((state) => state.setDark);
  const [password, setPassword] = useState('');

  async function savePassword() {
    if (!password || password.length < 6) return notifyError(t('pwdLengthMsg'));
    await resetPassword(password);
    setPassword('');
    notifySuccess(t('saveSuccessMsg'));
  }

  async function removeUser() {
    await userDelete();
    localStorage.removeItem('token');
    location.href = '/login';
  }

  const rows = [
    [t('emailAccount'), user.email],
    [t('username'), user.name],
    [t('role'), user.role?.name],
  ];

  return (
    <WorkspaceLayout title={t('settings')}>
      <Tabs className="settings-tabs w-full" defaultSelectedKey="details">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('settings')}>
            <Tabs.Tab id="details">
              {t('details')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="mail-management">
              {t('mailManagement')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-5" id="details">
          <section className="surface-card max-w-4xl overflow-hidden rounded-[24px]">
            <div className="border-b border-separator px-6 py-4">
              <h2 className="text-lg font-semibold">{t('details')}</h2>
            </div>

            <div className="divide-y divide-separator">
              {rows.map(([label, value]) => (
                <div className="grid gap-3 px-6 py-4 sm:grid-cols-[180px_1fr]" key={label}>
                  <div className="text-sm font-medium text-muted">{label}</div>
                  <div className="min-w-0 truncate text-sm font-semibold">{value || '-'}</div>
                </div>
              ))}

              <div className="grid gap-3 px-6 py-4 sm:grid-cols-[180px_1fr]">
                <div className="text-sm font-medium text-muted">{t('language')}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <ButtonGroup>
                    <Button variant={lang === 'zh' ? 'primary' : 'secondary'} onPress={() => setLang('zh')}>
                      简体中文
                    </Button>
                    <Button variant={lang === 'en' ? 'primary' : 'secondary'} onPress={() => setLang('en')}>
                      English
                    </Button>
                  </ButtonGroup>
                  <HeroSwitchField
                    checkedValue
                    label={dark ? 'Dark' : 'Light'}
                    onChange={setDark}
                    uncheckedValue={false}
                    value={dark}
                  />
                </div>
              </div>

              <div className="grid gap-3 px-6 py-4 sm:grid-cols-[180px_1fr]">
                <div className="text-sm font-medium text-muted">{t('password')}</div>
                <div className="flex max-w-xl gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-border bg-field px-3 py-2 outline-none"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('password')}
                    type="password"
                    value={password}
                  />
                  <Button onPress={savePassword}>{t('save')}</Button>
                </div>
              </div>

              <div className="grid gap-3 px-6 py-4 sm:grid-cols-[180px_1fr]">
                <div>
                  <div className="text-sm font-medium text-muted">{t('delete')}</div>
                  <div className="mt-1 text-xs text-muted">{t('deleteAccountHint')}</div>
                </div>
                <div>
                  <ConfirmButton
                    description={t('deleteAccountConfirmDescription')}
                    onConfirm={removeUser}
                    title={t('deleteAccountConfirmTitle')}
                  >
                    {t('delete')}
                  </ConfirmButton>
                </div>
              </div>
            </div>
          </section>
        </Tabs.Panel>

        <Tabs.Panel className="pt-5" id="mail-management">
          <section className="surface-card max-w-3xl rounded-2xl p-5">
            <AccountSwitcher variant="panel" />
          </section>
        </Tabs.Panel>
      </Tabs>
    </WorkspaceLayout>
  );
}
