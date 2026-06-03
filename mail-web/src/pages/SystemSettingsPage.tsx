import { Button, Chip, NumberField, Spinner } from '@heroui/react';
import {
  Database,
  ExternalLink,
  Globe2,
  Info,
  Mail,
  Megaphone,
  Palette,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteBackground, setBackground, setBlackList, settingQuery, settingSet } from '@/api/setting';
import ConfirmButton from '@/components/ConfirmButton';
import { EnabledSwitch, HeroSelectField } from '@/components/HeroFormControls';
import SideDrawer from '@/components/SideDrawer';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import { notifyError, notifySuccess } from '@/lib/notify';
import { cvtR2Url, fileToBase64, isEmail } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

type Settings = Record<string, any>;
type SectionId = 'site' | 'appearance' | 'mail' | 'storage' | 'push' | 'verification' | 'notice' | 'ai' | 'about';
type DrawerType =
  | 'background'
  | 'resend'
  | 'blacklist'
  | 's3'
  | 'telegram'
  | 'forward'
  | 'rules'
  | 'turnstile'
  | 'notice'
  | 'aiRules';

const sections: Array<{ id: SectionId; labelKey: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'site', labelKey: 'sysSite', icon: Globe2 },
  { id: 'appearance', labelKey: 'sysAppearance', icon: Palette },
  { id: 'mail', labelKey: 'sysMail', icon: Mail },
  { id: 'storage', labelKey: 'sysStorage', icon: Database },
  { id: 'push', labelKey: 'sysPush', icon: Send },
  { id: 'verification', labelKey: 'sysVerification', icon: ShieldCheck },
  { id: 'notice', labelKey: 'sysNotice', icon: Megaphone },
  { id: 'ai', labelKey: 'sysAi', icon: Sparkles },
  { id: 'about', labelKey: 'sysAbout', icon: Info },
];

const autoRefreshOptions = [
  { labelKey: 'disabled', value: 0 },
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '20s', value: 20 },
];

function asNumber(value: any, fallback = 0) {
  const next = Number(value ?? fallback);
  return Number.isNaN(next) ? fallback : next;
}

function asString(value: any) {
  return value == null ? '' : String(value);
}

function listFromCsv(value: any) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return asString(value)
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean).join(',');
}

function isDomain(value: string) {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(value);
}

function truthyStatus(value: any, enabledValue = 0) {
  return Number(value ?? 1) === enabledValue;
}

function secretSummary(value: any, t: (key: string) => string) {
  return value ? t('secretConfigured') : t('secretNotConfigured');
}

export default function SystemSettingsPage() {
  const { t } = useTranslation();
  const setStoreSettings = useAppStore((state) => state.setSettings);
  const setDomainList = useAppStore((state) => state.setDomainList);
  const domainList = useAppStore((state) => state.domainList);
  const [active, setActive] = useState<SectionId>('site');
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawer, setDrawer] = useState<DrawerType | null>(null);
  const [form, setForm] = useState<Settings>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const knownDomainList = useMemo(() => {
    const list = Array.isArray(settings.domainList) ? settings.domainList : domainList;
    return list.length ? list : [];
  }, [domainList, settings.domainList]);

  async function loadSettings(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const data = ((await settingQuery()) || {}) as Settings;
      setSettings(data);
      setStoreSettings(data);
      setDomainList(Array.isArray(data.domainList) ? data.domainList : []);
      if (data.title) document.title = data.title;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateSetting(key: string, value: any) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateForm(key: string, value: any) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function savePatch(patch: Settings, options: { closeDrawer?: boolean; successText?: string } = {}) {
    setSaving(true);
    try {
      await settingSet(patch);
      notifySuccess(options.successText || t('saveSuccessMsg'));
      if (options.closeDrawer) setDrawer(null);
      await loadSettings(false);
    } finally {
      setSaving(false);
    }
  }

  function openDrawer(type: DrawerType) {
    if (type === 'background') {
      setForm({
        background: settings.background?.startsWith?.('http') ? settings.background : '',
        preview: cvtR2Url(settings.background),
      });
    }
    if (type === 'resend') {
      setForm({
        domain: knownDomainList[0] || '',
        token: '',
        resendTokens: { ...(settings.resendTokens || {}) },
      });
    }
    if (type === 'blacklist') {
      setForm({
        blackFrom: listFromCsv(settings.blackFrom),
        blackSubject: listFromCsv(settings.blackSubject),
        blackContent: listFromCsv(settings.blackContent),
      });
    }
    if (type === 's3') {
      setForm({
        bucket: asString(settings.bucket),
        endpoint: asString(settings.endpoint),
        region: asString(settings.region),
        forcePathStyle: asNumber(settings.forcePathStyle, 1),
        s3AccessKey: '',
        s3SecretKey: '',
      });
    }
    if (type === 'telegram') {
      setForm({
        tgBotStatus: asNumber(settings.tgBotStatus, 1),
        tgBotToken: '',
        tgChatId: listFromCsv(settings.tgChatId),
        customDomain: asString(settings.customDomain),
        tgMsgFrom: asString(settings.tgMsgFrom || 'show'),
        tgMsgTo: asString(settings.tgMsgTo || 'show'),
        tgMsgText: asString(settings.tgMsgText || 'show'),
      });
    }
    if (type === 'forward') {
      setForm({
        forwardStatus: asNumber(settings.forwardStatus, 1),
        forwardEmail: listFromCsv(settings.forwardEmail),
      });
    }
    if (type === 'rules') {
      setForm({
        ruleType: asNumber(settings.ruleType, 0),
        ruleEmail: listFromCsv(settings.ruleEmail),
      });
    }
    if (type === 'turnstile') {
      setForm({ siteKey: '', secretKey: '' });
    }
    if (type === 'notice') {
      setForm({
        notice: asNumber(settings.notice, 1),
        noticeTitle: asString(settings.noticeTitle),
        noticeContent: asString(settings.noticeContent),
        noticeType: asString(settings.noticeType || 'none'),
        noticeDuration: asNumber(settings.noticeDuration, 0),
        noticePosition: asString(settings.noticePosition || 'top-right'),
        noticeOffset: asNumber(settings.noticeOffset, 0),
        noticeWidth: asNumber(settings.noticeWidth, 0),
      });
    }
    if (type === 'aiRules') {
      setForm({ aiCodeFilter: listFromCsv(settings.aiCodeFilter) });
    }
    setDrawer(type);
  }

  async function saveSite() {
    await savePatch({
      register: asNumber(settings.register, 1),
      loginDomain: asNumber(settings.loginDomain, 0),
      regKey: asNumber(settings.regKey, 1),
      addEmail: asNumber(settings.addEmail, 1),
      manyEmail: asNumber(settings.manyEmail, 1),
      minEmailPrefix: asNumber(settings.minEmailPrefix, 1),
      emailPrefixFilter: Array.isArray(settings.emailPrefixFilter)
        ? settings.emailPrefixFilter
        : listFromCsv(settings.emailPrefixFilter),
    });
  }

  async function saveAppearance() {
    await savePatch({
      title: asString(settings.title),
      loginOpacity: asNumber(settings.loginOpacity, 1),
      loginDarkenFactor: Math.min(1, Math.max(0, asNumber(settings.loginDarkenFactor, 0))),
    });
  }

  async function saveMail() {
    await savePatch({
      receive: asNumber(settings.receive, 1),
      autoRefresh: asNumber(settings.autoRefresh, 0),
      send: asNumber(settings.send, 1),
      noRecipient: asNumber(settings.noRecipient, 1),
    });
  }

  async function saveStorage() {
    await savePatch({ r2Domain: asString(settings.r2Domain) });
  }

  async function saveVerification() {
    await savePatch({
      registerVerify: asNumber(settings.registerVerify, 1),
      addEmailVerify: asNumber(settings.addEmailVerify, 1),
      regVerifyCount: Math.max(1, asNumber(settings.regVerifyCount, 1)),
      addVerifyCount: Math.max(1, asNumber(settings.addVerifyCount, 1)),
    });
  }

  async function saveAi() {
    await savePatch({ aiCode: asNumber(settings.aiCode, 1) });
  }

  async function saveBackgroundForm() {
    const background = asString(form.background);
    if (background && !background.startsWith('http') && !background.startsWith('data:')) {
      notifyError(t('imageLinkErrorMsg'));
      return;
    }
    setSaving(true);
    try {
      await setBackground(background);
      notifySuccess(t('saveSuccessMsg'));
      setDrawer(null);
      await loadSettings(false);
    } finally {
      setSaving(false);
    }
  }

  async function removeBackground() {
    await deleteBackground();
    notifySuccess(t('delSuccessMsg'));
    await loadSettings(false);
  }

  async function saveBlacklist() {
    setSaving(true);
    try {
      await setBlackList({
        blackFrom: joinList(form.blackFrom || []),
        blackSubject: joinList(form.blackSubject || []),
        blackContent: joinList(form.blackContent || []),
      });
      notifySuccess(t('saveSuccessMsg'));
      setDrawer(null);
      await loadSettings(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveS3() {
    const patch: Settings = {
      bucket: asString(form.bucket),
      endpoint: asString(form.endpoint),
      region: asString(form.region),
      forcePathStyle: asNumber(form.forcePathStyle, 1),
    };
    if (form.s3AccessKey) patch.s3AccessKey = form.s3AccessKey;
    if (form.s3SecretKey) patch.s3SecretKey = form.s3SecretKey;
    await savePatch(patch, { closeDrawer: true });
  }

  async function clearS3() {
    await savePatch(
      {
        bucket: '',
        endpoint: '',
        region: '',
        s3AccessKey: '',
        s3SecretKey: '',
        forcePathStyle: 1,
      },
      { closeDrawer: true },
    );
  }

  async function saveTelegram() {
    const patch: Settings = {
      tgBotStatus: asNumber(form.tgBotStatus, 1),
      tgChatId: joinList(form.tgChatId || []),
      customDomain: asString(form.customDomain),
      tgMsgFrom: asString(form.tgMsgFrom || 'show'),
      tgMsgTo: asString(form.tgMsgTo || 'show'),
      tgMsgText: asString(form.tgMsgText || 'show'),
    };
    if (form.tgBotToken) patch.tgBotToken = form.tgBotToken;
    await savePatch(patch, { closeDrawer: true });
  }

  async function saveForward() {
    await savePatch(
      {
        forwardStatus: asNumber(form.forwardStatus, 1),
        forwardEmail: joinList(form.forwardEmail || []),
      },
      { closeDrawer: true },
    );
  }

  async function saveRules() {
    await savePatch(
      {
        ruleType: asNumber(form.ruleType, 0),
        ruleEmail: joinList(form.ruleEmail || []),
      },
      { closeDrawer: true },
    );
  }

  async function saveTurnstile() {
    const patch: Settings = {};
    if (form.siteKey) patch.siteKey = form.siteKey;
    if (form.secretKey) patch.secretKey = form.secretKey;
    if (!Object.keys(patch).length) {
      setDrawer(null);
      return;
    }
    await savePatch(patch, { closeDrawer: true });
  }

  async function saveNotice() {
    await savePatch(
      {
        notice: asNumber(form.notice, 1),
        noticeTitle: asString(form.noticeTitle),
        noticeContent: asString(form.noticeContent),
        noticeType: asString(form.noticeType || 'none'),
        noticeDuration: asNumber(form.noticeDuration, 0),
        noticePosition: asString(form.noticePosition || 'top-right'),
        noticeOffset: asNumber(form.noticeOffset, 0),
        noticeWidth: asNumber(form.noticeWidth, 0),
      },
      { closeDrawer: true },
    );
  }

  async function saveAiRules() {
    await savePatch({ aiCodeFilter: joinList(form.aiCodeFilter || []) }, { closeDrawer: true });
  }

  function renderSection() {
    if (active === 'site') return renderSite();
    if (active === 'appearance') return renderAppearance();
    if (active === 'mail') return renderMail();
    if (active === 'storage') return renderStorage();
    if (active === 'push') return renderPush();
    if (active === 'verification') return renderVerification();
    if (active === 'notice') return renderNotice();
    if (active === 'ai') return renderAi();
    return renderAbout();
  }

  function renderSite() {
    return (
      <SettingsPanel action={<Button onPress={saveSite}>{t('save')}</Button>} description={t('sysSiteHint')} title={t('sysSite')}>
        <SettingRow description={t('websiteRegDesc')} label={t('websiteReg')}>
          <EnabledSwitch
            onChange={(value) => updateSetting('register', value)}
            value={asNumber(settings.register, 1)}
          />
        </SettingRow>
        <SettingRow description={t('loginDomainDesc2')} label={t('loginDomain')}>
          <EnabledSwitch
            disabledValue={0}
            enabledValue={1}
            onChange={(value) => updateSetting('loginDomain', value)}
            value={asNumber(settings.loginDomain, 0)}
          />
        </SettingRow>
        <SettingRow description={t('regKeyPolicyDesc')} label={t('regKey')}>
          <HeroSelectField
            className="w-44"
            onChange={(value) => updateSetting('regKey', Number(value))}
            options={[
              { label: t('enabled'), value: '0' },
              { label: t('disabled'), value: '1' },
              { label: t('optional'), value: '2' },
            ]}
            value={String(asNumber(settings.regKey, 1))}
          />
        </SettingRow>
        <SettingRow label={t('addAccount')}>
          <EnabledSwitch
            onChange={(value) => updateSetting('addEmail', value)}
            value={asNumber(settings.addEmail, 1)}
          />
        </SettingRow>
        <SettingRow description={t('multipleEmailDesc')} label={t('multipleEmail')}>
          <EnabledSwitch
            onChange={(value) => updateSetting('manyEmail', value)}
            value={asNumber(settings.manyEmail, 1)}
          />
        </SettingRow>
        <SettingRow description={t('emailPrefixLengthDesc')} label={t('emailPrefixLength')}>
          <NumberControl
            max={20}
            min={1}
            onChange={(value) => updateSetting('minEmailPrefix', value)}
            value={asNumber(settings.minEmailPrefix, 1)}
          />
        </SettingRow>
        <SettingRow description={t('emailPrefixBlockedWordsDesc')} label={t('emailPrefixBlockedWords')}>
          <TagListField
            onChange={(value) => updateSetting('emailPrefixFilter', value)}
            placeholder={t('inputAndEnter')}
            value={Array.isArray(settings.emailPrefixFilter) ? settings.emailPrefixFilter : listFromCsv(settings.emailPrefixFilter)}
          />
        </SettingRow>
      </SettingsPanel>
    );
  }

  function renderAppearance() {
    const backgroundUrl = cvtR2Url(settings.background);
    return (
      <SettingsPanel action={<Button onPress={saveAppearance}>{t('save')}</Button>} description={t('sysAppearanceHint')} title={t('sysAppearance')}>
        <SettingRow label={t('websiteTitle')}>
          <TextInput onChange={(value) => updateSetting('title', value)} value={asString(settings.title)} />
        </SettingRow>
        <SettingRow description={t('loginBoxOpacityDesc')} label={t('loginBoxOpacity')}>
          <NumberControl max={1} min={0} onChange={(value) => updateSetting('loginOpacity', value)} step={0.01} value={asNumber(settings.loginOpacity, 1)} />
        </SettingRow>
        <SettingRow description={t('backgroundDarkenDesc')} label={t('backgroundDarken')}>
          <NumberControl max={1} min={0} onChange={(value) => updateSetting('loginDarkenFactor', value)} step={0.01} value={asNumber(settings.loginDarkenFactor, 0)} />
        </SettingRow>
        <SettingRow description={t('backgroundWarning')} label={t('loginBackground')}>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="h-16 w-28 overflow-hidden rounded-xl border border-border bg-surface-secondary">
              {backgroundUrl ? <img alt="" className="h-full w-full object-cover" src={backgroundUrl} /> : null}
            </div>
            <Button size="sm" variant="outline" onPress={() => openDrawer('background')}>
              <Pencil className="size-4" />
              {t('edit')}
            </Button>
            <ConfirmButton
              description={t('delBackgroundConfirm')}
              isDisabled={!settings.background}
              onConfirm={removeBackground}
              size="sm"
              title={t('deleteBackgroundConfirmTitle')}
              variant="danger"
            >
              <Trash2 className="size-4" />
              {t('delete')}
            </ConfirmButton>
          </div>
        </SettingRow>
      </SettingsPanel>
    );
  }

  function renderMail() {
    return (
      <SettingsPanel action={<Button onPress={saveMail}>{t('save')}</Button>} description={t('sysMailHint')} title={t('sysMail')}>
        <SettingRow label={t('receiveEmail')}>
          <EnabledSwitch value={asNumber(settings.receive, 1)} onChange={(value) => updateSetting('receive', value)} />
        </SettingRow>
        <SettingRow description={t('autoRefreshDesc')} label={t('autoRefresh')}>
          <HeroSelectField
            className="w-44"
            onChange={(value) => updateSetting('autoRefresh', Number(value))}
            options={autoRefreshOptions.map((item) => ({ label: item.label || t(item.labelKey || ''), value: String(item.value) }))}
            value={String(asNumber(settings.autoRefresh, 0))}
          />
        </SettingRow>
        <SettingRow label={t('sendEmail')}>
          <EnabledSwitch value={asNumber(settings.send, 1)} onChange={(value) => updateSetting('send', value)} />
        </SettingRow>
        <SettingRow description={t('noRecipientDesc')} label={t('noRecipientTitle')}>
          <EnabledSwitch value={asNumber(settings.noRecipient, 1)} onChange={(value) => updateSetting('noRecipient', value)} />
        </SettingRow>
        <SettingRow description={settings.hasCfEmail ? t('cloudflareEmailSending') : t('resendTokenDesc')} label={settings.hasCfEmail ? t('cloudflareEmailSending') : t('resendToken')}>
          {settings.hasCfEmail ? (
            <StatusChip active>{t('enabled')}</StatusChip>
          ) : (
            <Button size="sm" variant="outline" onPress={() => openDrawer('resend')}>
              {t('manage')}
            </Button>
          )}
        </SettingRow>
        <SettingRow description={t('blackListDesc')} label={t('blackList')}>
          <Button size="sm" variant="outline" onPress={() => openDrawer('blacklist')}>
            {t('manage')}
          </Button>
        </SettingRow>
      </SettingsPanel>
    );
  }

  function renderStorage() {
    return (
      <SettingsPanel action={<Button onPress={saveStorage}>{t('save')}</Button>} description={t('sysStorageHint')} title={t('sysStorage')}>
        <SettingRow description={t('ossDomainDesc')} label={t('osDomain')}>
          <TextInput onChange={(value) => updateSetting('r2Domain', value)} placeholder="static.example.com" value={asString(settings.r2Domain)} />
        </SettingRow>
        <SettingRow label={t('storageType')}>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Chip variant="soft">{asString(settings.storageType) || t('notConfigured')}</Chip>
            <Button size="sm" variant="outline" onPress={() => openDrawer('s3')}>
              {t('s3Configuration')}
            </Button>
          </div>
        </SettingRow>
      </SettingsPanel>
    );
  }

  function renderPush() {
    return (
      <SettingsPanel description={t('sysPushHint')} title={t('sysPush')}>
        <SettingRow description={t('tgBotDesc')} label={t('tgBot')}>
          <div className="flex items-center justify-end gap-3">
            <StatusChip active={truthyStatus(settings.tgBotStatus)}>{truthyStatus(settings.tgBotStatus) ? t('enabled') : t('disabled')}</StatusChip>
            <Button size="sm" variant="outline" onPress={() => openDrawer('telegram')}>
              {t('edit')}
            </Button>
          </div>
        </SettingRow>
        <SettingRow description={t('otherEmailDesc')} label={t('otherEmail')}>
          <div className="flex items-center justify-end gap-3">
            <StatusChip active={truthyStatus(settings.forwardStatus)}>{truthyStatus(settings.forwardStatus) ? t('enabled') : t('disabled')}</StatusChip>
            <Button size="sm" variant="outline" onPress={() => openDrawer('forward')}>
              {t('edit')}
            </Button>
          </div>
        </SettingRow>
        <SettingRow description={t('forwardingRulesDesc')} label={t('forwardingRules')}>
          <div className="flex items-center justify-end gap-3">
            <Chip variant="soft">{asNumber(settings.ruleType, 0) === 0 ? t('forwardAll') : t('rules')}</Chip>
            <Button size="sm" variant="outline" onPress={() => openDrawer('rules')}>
              {t('edit')}
            </Button>
          </div>
        </SettingRow>
      </SettingsPanel>
    );
  }

  function renderVerification() {
    return (
      <SettingsPanel action={<Button onPress={saveVerification}>{t('save')}</Button>} description={t('sysVerificationHint')} title={t('sysVerification')}>
        <SettingRow label={t('signUpVerification')}>
          <HeroSelectField
            className="w-44"
            onChange={(value) => updateSetting('registerVerify', Number(value))}
            options={verifyOptions(t)}
            value={String(asNumber(settings.registerVerify, 1))}
          />
        </SettingRow>
        <SettingRow description={t('rulesVerifyDesc')} label={t('regVerifyCount')}>
          <NumberControl min={1} onChange={(value) => updateSetting('regVerifyCount', value)} value={asNumber(settings.regVerifyCount, 1)} />
        </SettingRow>
        <SettingRow label={t('addEmailVerification')}>
          <HeroSelectField
            className="w-44"
            onChange={(value) => updateSetting('addEmailVerify', Number(value))}
            options={verifyOptions(t)}
            value={String(asNumber(settings.addEmailVerify, 1))}
          />
        </SettingRow>
        <SettingRow description={t('rulesVerifyDesc')} label={t('addVerifyCount')}>
          <NumberControl min={1} onChange={(value) => updateSetting('addVerifyCount', value)} value={asNumber(settings.addVerifyCount, 1)} />
        </SettingRow>
        <SettingRow description={t('turnstileSecretHint')} label={t('turnstileKeys')}>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Chip variant="soft">Site: {secretSummary(settings.siteKey, t)}</Chip>
            <Chip variant="soft">Secret: {secretSummary(settings.secretKey, t)}</Chip>
            <Button size="sm" variant="outline" onPress={() => openDrawer('turnstile')}>
              {t('edit')}
            </Button>
          </div>
        </SettingRow>
      </SettingsPanel>
    );
  }

  function renderNotice() {
    return (
      <SettingsPanel description={t('sysNoticeHint')} title={t('sysNotice')}>
        <SettingRow description={asString(settings.noticeTitle) || t('notConfigured')} label={t('noticePopup')}>
          <div className="flex items-center justify-end gap-3">
            <StatusChip active={truthyStatus(settings.notice)}>{truthyStatus(settings.notice) ? t('enabled') : t('disabled')}</StatusChip>
            <Button size="sm" variant="outline" onPress={() => openDrawer('notice')}>
              {t('edit')}
            </Button>
          </div>
        </SettingRow>
        <SettingRow label={t('noticePosition')}>
          <Chip variant="soft">{asString(settings.noticePosition) || t('notConfigured')}</Chip>
        </SettingRow>
      </SettingsPanel>
    );
  }

  function renderAi() {
    return (
      <SettingsPanel action={<Button onPress={saveAi}>{t('save')}</Button>} description={t('sysAiHint')} title={t('sysAi')}>
        <SettingRow label={t('codeRecognition')}>
          <EnabledSwitch value={asNumber(settings.aiCode, 1)} onChange={(value) => updateSetting('aiCode', value)} />
        </SettingRow>
        <SettingRow description={t('codeRecognitionRulesDesc')} label={t('codeRecognitionRules')}>
          <Button size="sm" variant="outline" onPress={() => openDrawer('aiRules')}>
            {t('manage')}
          </Button>
        </SettingRow>
      </SettingsPanel>
    );
  }

  function renderAbout() {
    return (
      <SettingsPanel description={t('sysAboutHint')} title={t('sysAbout')}>
        <LinkRow href="https://github.com/maillab/cloud-mail" label="GitHub" value="maillab/cloud-mail" />
        <LinkRow href="https://t.me/cloud_mail_tg" label="Telegram" value="cloud_mail_tg" />
        <LinkRow href="https://doc.skymail.ink" label={t('document')} value="doc.skymail.ink" />
        <LinkRow href="https://doc.skymail.ink/support.html" label={t('support')} value={t('supportDesc')} />
      </SettingsPanel>
    );
  }

  return (
    <WorkspaceLayout
      actions={
        <Button isDisabled={loading} variant="secondary" onPress={() => loadSettings()}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      }
      title={t('SystemSettings')}
    >
      {loading ? (
        <div className="flex h-80 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,900px)]">
          <nav className="surface-card flex gap-2 overflow-x-auto rounded-[24px] p-2 lg:block lg:space-y-1 lg:overflow-visible">
            {sections.map((section) => {
              const Icon = section.icon;
              const selected = active === section.id;
              return (
                <button
                  className={`flex shrink-0 items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition lg:w-full ${
                    selected ? 'bg-surface-secondary text-foreground' : 'text-muted hover:bg-surface-tertiary hover:text-foreground'
                  }`}
                  key={section.id}
                  onClick={() => setActive(section.id)}
                  type="button"
                >
                  <Icon className="size-5" />
                  <span className="whitespace-nowrap font-medium">{t(section.labelKey)}</span>
                </button>
              );
            })}
          </nav>
          <div className="min-w-0">{renderSection()}</div>
        </div>
      )}
      {renderDrawer()}
    </WorkspaceLayout>
  );

  function renderDrawer() {
    if (!drawer) return null;
    if (drawer === 'background') {
      return (
        <SideDrawer
          footer={drawerFooter(saveBackgroundForm)}
          onOpenChange={(open) => !open && setDrawer(null)}
          open
          title={t('loginBackground')}
          widthClass="sm:max-w-[640px]"
        >
          <div className="space-y-4">
            <TextInput label={t('imageLink')} onChange={(value) => updateForm('background', value)} placeholder="https://example.com/background.jpg" value={asString(form.background)} />
            <input
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const image = await fileToBase64(file, true);
                updateForm('background', image);
                updateForm('preview', image);
              }}
              ref={fileInputRef}
              type="file"
            />
            <Button variant="secondary" onPress={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              {t('localUpload')}
            </Button>
            <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-surface-secondary">
              {form.preview || form.background ? <img alt="" className="h-full w-full object-cover" src={form.preview || form.background} /> : null}
            </div>
          </div>
        </SideDrawer>
      );
    }
    if (drawer === 'resend') {
      const tokens = form.resendTokens || {};
      return (
        <SideDrawer footer={drawerFooter(saveResendToken)} onOpenChange={(open) => !open && setDrawer(null)} open title={t('resendToken')}>
          <div className="space-y-4">
            <Field label={t('domain')}>
              <HeroSelectField
                onChange={(value) => updateForm('domain', value)}
                options={knownDomainList.map((domain) => ({ label: domain, value: domain }))}
                placeholder={t('domain')}
                value={asString(form.domain)}
              />
            </Field>
            <TextInput label="Token" onChange={(value) => updateForm('token', value)} value={asString(form.token)} />
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted">{t('resendTokenList')}</div>
              {Object.keys(tokens).length ? (
                Object.entries(tokens).map(([domain, token]) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-secondary px-3 py-2 text-sm" key={domain}>
                    <span className="min-w-0 truncate">{domain}</span>
                    <span className="min-w-0 truncate text-muted">{String(token)}</span>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="tertiary"
                      onPress={() => {
                        const next = { ...tokens };
                        delete next[domain];
                        updateForm('resendTokens', next);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">{t('noMoreData')}</p>
              )}
            </div>
          </div>
        </SideDrawer>
      );
    }
    if (drawer === 'blacklist') {
      return (
        <SideDrawer footer={drawerFooter(saveBlacklist)} onOpenChange={(open) => !open && setDrawer(null)} open title={t('blackList')}>
          <div className="space-y-4">
            <TagListField
              label={t('blackFromDesc')}
              onChange={(value) => updateForm('blackFrom', value)}
              validate={(value) => isEmail(value) || isDomain(value)}
              value={form.blackFrom || []}
            />
            <TagListField label={t('blackSubjectDesc')} onChange={(value) => updateForm('blackSubject', value)} value={form.blackSubject || []} />
            <TagListField label={t('blackContentDesc')} onChange={(value) => updateForm('blackContent', value)} value={form.blackContent || []} />
          </div>
        </SideDrawer>
      );
    }
    if (drawer === 's3') {
      return (
        <SideDrawer
          footer={
            <>
              <Button onPress={() => setDrawer(null)} variant="secondary">
                {t('cancel')}
              </Button>
              <Button isDisabled={saving} onPress={clearS3} variant="secondary">
                {t('clear')}
              </Button>
              <Button isDisabled={saving} onPress={saveS3}>
                {t('save')}
              </Button>
            </>
          }
          onOpenChange={(open) => !open && setDrawer(null)}
          open
          title={t('s3Configuration')}
        >
          <div className="space-y-4">
            <TextInput label="Bucket" onChange={(value) => updateForm('bucket', value)} value={asString(form.bucket)} />
            <TextInput label="Endpoint" onChange={(value) => updateForm('endpoint', value)} value={asString(form.endpoint)} />
            <TextInput label="Region" onChange={(value) => updateForm('region', value)} value={asString(form.region)} />
            <SecretInput label="Access Key" onChange={(value) => updateForm('s3AccessKey', value)} placeholder={secretSummary(settings.s3AccessKey, t)} value={asString(form.s3AccessKey)} />
            <SecretInput label="Secret Key" onChange={(value) => updateForm('s3SecretKey', value)} placeholder={secretSummary(settings.s3SecretKey, t)} value={asString(form.s3SecretKey)} />
            <Field label="ForcePathStyle">
              <EnabledSwitch value={asNumber(form.forcePathStyle, 1)} onChange={(value) => updateForm('forcePathStyle', value)} />
            </Field>
          </div>
        </SideDrawer>
      );
    }
    if (drawer === 'telegram') {
      return (
        <SideDrawer footer={drawerFooter(saveTelegram)} onOpenChange={(open) => !open && setDrawer(null)} open title={t('tgBot')}>
          <div className="space-y-4">
            <Field label={t('status')}>
              <EnabledSwitch value={asNumber(form.tgBotStatus, 1)} onChange={(value) => updateForm('tgBotStatus', value)} />
            </Field>
            <SecretInput label={t('tgBotToken')} onChange={(value) => updateForm('tgBotToken', value)} placeholder={secretSummary(settings.tgBotToken, t)} value={asString(form.tgBotToken)} />
            <TagListField
              label={t('tgChatId')}
              onChange={(value) => updateForm('tgChatId', value)}
              validate={(value) => !Number.isNaN(Number(value))}
              value={form.tgChatId || []}
            />
            <TextInput label={t('customDomain')} onChange={(value) => updateForm('customDomain', value)} value={asString(form.customDomain)} />
            <SelectInput label={t('from')} name="tgMsgFrom" options={msgFromOptions(t)} />
            <SelectInput label={t('recipient')} name="tgMsgTo" options={showHideOptions(t)} />
            <SelectInput label={t('emailText')} name="tgMsgText" options={showHideOptions(t)} />
          </div>
        </SideDrawer>
      );
    }
    if (drawer === 'forward') {
      return (
        <SideDrawer footer={drawerFooter(saveForward)} onOpenChange={(open) => !open && setDrawer(null)} open title={t('otherEmail')}>
          <div className="space-y-4">
            <Field label={t('status')}>
              <EnabledSwitch value={asNumber(form.forwardStatus, 1)} onChange={(value) => updateForm('forwardStatus', value)} />
            </Field>
            <TagListField
              label={t('forwardEmail')}
              onChange={(value) => updateForm('forwardEmail', value)}
              validate={isEmail}
              value={form.forwardEmail || []}
            />
          </div>
        </SideDrawer>
      );
    }
    if (drawer === 'rules') {
      return (
        <SideDrawer footer={drawerFooter(saveRules)} onOpenChange={(open) => !open && setDrawer(null)} open title={t('forwardingRules')}>
          <div className="space-y-4">
            <Field label={t('ruleType')}>
              <HeroSelectField
                onChange={(value) => updateForm('ruleType', value)}
                options={[
                  { label: t('forwardAll'), value: '0' },
                  { label: t('rules'), value: '1' },
                ]}
                value={String(asNumber(form.ruleType, 0))}
              />
            </Field>
            <TagListField label={t('ruleEmail')} onChange={(value) => updateForm('ruleEmail', value)} validate={isEmail} value={form.ruleEmail || []} />
          </div>
        </SideDrawer>
      );
    }
    if (drawer === 'turnstile') {
      return (
        <SideDrawer footer={drawerFooter(saveTurnstile)} onOpenChange={(open) => !open && setDrawer(null)} open title={t('turnstileKeys')}>
          <div className="space-y-4">
            <SecretInput label="Site Key" onChange={(value) => updateForm('siteKey', value)} placeholder={secretSummary(settings.siteKey, t)} value={asString(form.siteKey)} />
            <SecretInput label="Secret Key" onChange={(value) => updateForm('secretKey', value)} placeholder={secretSummary(settings.secretKey, t)} value={asString(form.secretKey)} />
          </div>
        </SideDrawer>
      );
    }
    if (drawer === 'notice') {
      return (
        <SideDrawer footer={drawerFooter(saveNotice)} onOpenChange={(open) => !open && setDrawer(null)} open title={t('noticePopup')} widthClass="sm:max-w-[720px]">
          <div className="space-y-4">
            <Field label={t('status')}>
              <EnabledSwitch value={asNumber(form.notice, 1)} onChange={(value) => updateForm('notice', value)} />
            </Field>
            <TextInput label={t('noticeTitleField')} onChange={(value) => updateForm('noticeTitle', value)} value={asString(form.noticeTitle)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label={t('noticeType')} name="noticeType" options={noticeTypeOptions(t)} />
              <SelectInput label={t('noticePosition')} name="noticePosition" options={noticePositionOptions(t)} />
              <NumberInput label={t('width')} onChange={(value) => updateForm('noticeWidth', value)} value={asNumber(form.noticeWidth, 0)} />
              <NumberInput label={t('offset')} onChange={(value) => updateForm('noticeOffset', value)} value={asNumber(form.noticeOffset, 0)} />
              <NumberInput label={t('duration')} onChange={(value) => updateForm('noticeDuration', value)} value={asNumber(form.noticeDuration, 0)} />
            </div>
            <Field label={t('noticeContent')}>
              <textarea
                className="min-h-64 w-full resize-y rounded-xl border border-border bg-field px-3 py-2 outline-none"
                onChange={(event) => updateForm('noticeContent', event.target.value)}
                value={asString(form.noticeContent)}
              />
            </Field>
          </div>
        </SideDrawer>
      );
    }
    return (
      <SideDrawer footer={drawerFooter(saveAiRules)} onOpenChange={(open) => !open && setDrawer(null)} open title={t('codeRecognitionRules')}>
        <TagListField
          label={t('senderRules')}
          onChange={(value) => updateForm('aiCodeFilter', value)}
          validate={(value) => isEmail(value) || isDomain(value)}
          value={form.aiCodeFilter || []}
        />
      </SideDrawer>
    );
  }

  async function saveResendToken() {
    const tokens = { ...(form.resendTokens || {}) };
    const domain = asString(form.domain).replace(/^@/, '');
    const token = asString(form.token).trim();
    if (domain && token) tokens[domain] = token;
    await savePatch({ resendTokens: tokens }, { closeDrawer: true });
  }

  function drawerFooter(onSave: () => Promise<void> | void) {
    return (
      <>
        <Button onPress={() => setDrawer(null)} variant="secondary">
          {t('cancel')}
        </Button>
        <Button isDisabled={saving} onPress={onSave}>
          {t('save')}
        </Button>
      </>
    );
  }

  function SelectInput({ label, name, options }: { label: string; name: string; options: Array<{ label: string; value: string }> }) {
    return (
      <Field label={label}>
        <HeroSelectField
          onChange={(value) => updateForm(name, value)}
          options={options}
          placeholder={label}
          value={asString(form[name])}
        />
      </Field>
    );
  }
}

function verifyOptions(t: (key: string) => string) {
  return [
    { label: t('enabled'), value: '0' },
    { label: t('disabled'), value: '1' },
    { label: t('rulesVerify'), value: '2' },
  ];
}

function showHideOptions(t: (key: string) => string) {
  return [
    { label: t('show'), value: 'show' },
    { label: t('hide'), value: 'hide' },
  ];
}

function msgFromOptions(t: (key: string) => string) {
  return [...showHideOptions(t), { label: t('onlyName'), value: 'only-name' }];
}

function noticeTypeOptions(t: (key: string) => string) {
  return ['none', 'primary', 'success', 'warning', 'info'].map((value) => ({
    label: value === 'none' ? t('none') : value,
    value,
  }));
}

function noticePositionOptions(t: (key: string) => string) {
  return [
    { label: t('topLeft'), value: 'top-left' },
    { label: t('topRight'), value: 'top-right' },
    { label: t('bottomLeft'), value: 'bottom-left' },
    { label: t('bottomRight'), value: 'bottom-right' },
  ];
}

function SettingsPanel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="surface-card overflow-hidden rounded-[24px]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(180px,260px)_1fr]">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {description ? <div className="mt-1 text-sm leading-5 text-muted">{description}</div> : null}
      </div>
      <div className="min-w-0 md:flex md:justify-end">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const input = (
    <input
      className="w-full rounded-xl border border-border bg-field px-3 py-2 outline-none"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  );
  return label ? <Field label={label}>{input}</Field> : input;
}

function SecretInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <input
        autoComplete="new-password"
        className="w-full rounded-xl border border-border bg-field px-3 py-2 outline-none"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="password"
        value={value}
      />
    </Field>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <input
        className="w-full rounded-xl border border-border bg-field px-3 py-2 outline-none"
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </Field>
  );
}

function NumberControl({ value, onChange, min, max, step = 1 }: { value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <NumberField maxValue={max} minValue={min} onChange={(next: any) => onChange(asNumber(next, min ?? 0))} step={step} value={value}>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input className="w-24 text-center" />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  );
}

function TagListField({
  label,
  value,
  onChange,
  placeholder,
  validate,
}: {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  validate?: (value: string) => boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  function addTokens(text: string) {
    const items = listFromCsv(text);
    if (!items.length) return;
    const accepted = items.filter((item) => !validate || validate(item));
    if (accepted.length !== items.length) notifyError(t('invalidValueMsg'));
    onChange(Array.from(new Set([...value, ...accepted])));
    setDraft('');
  }

  const content = (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <Chip key={item} variant="soft">
            <Chip.Label>{item}</Chip.Label>
            <button
              className="ml-1 inline-flex"
              onClick={() => onChange(value.filter((next) => next !== item))}
              type="button"
            >
              <X className="size-3" />
            </button>
          </Chip>
        ))}
      </div>
      <input
        className="w-full rounded-xl border border-border bg-field px-3 py-2 outline-none"
        onBlur={() => addTokens(draft)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            addTokens(draft);
          }
        }}
        placeholder={placeholder || t('inputAndEnter')}
        value={draft}
      />
    </div>
  );

  return label ? <Field label={label}>{content}</Field> : content;
}

function StatusChip({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <Chip color={active ? 'success' : 'default'} variant="soft">
      {children}
    </Chip>
  );
}

function LinkRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <SettingRow label={label}>
      <a className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline" href={href} rel="noreferrer" target="_blank">
        {value}
        <ExternalLink className="size-4" />
      </a>
    </SettingRow>
  );
}
