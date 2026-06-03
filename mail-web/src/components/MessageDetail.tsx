import { Avatar, Button, Tooltip as HeroTooltip } from '@heroui/react';
import { ArrowLeft, Download, Reply, Star, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { allEmailDelete } from '@/api/all-email';
import { emailDelete, emailRead } from '@/api/email';
import { starAdd, starCancel } from '@/api/star';
import { hasPerm } from '@/lib/permissions';
import {
  colorFor,
  cvtR2Url,
  EmailUnreadEnum,
  formatBytes,
  formatDetailDate,
  formatMailContent,
  formatRecipients,
  getExtName,
  initials,
} from '@/lib/utils';
import { notifySuccess } from '@/lib/notify';
import { useAppStore } from '@/store/app-store';
import type { Email } from '@/types';
import ConfirmButton from '@/components/ConfirmButton';
import ShadowHtml from '@/components/ShadowHtml';

const Tooltip = HeroTooltip as any;

function isImage(name = '') {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'jfif', 'webp'].includes(getExtName(name));
}

export default function MessageDetail({
  email,
  onBack,
}: {
  email: Email | null;
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const selected = useAppStore((state) => state.selectedEmail);
  const selectEmail = useAppStore((state) => state.selectEmail);
  const setDeleteIds = useAppStore((state) => state.setDeleteIds);
  const setStarChanged = useAppStore((state) => state.setStarChanged);
  const openComposer = useAppStore((state) => state.openComposer);
  const [preview, setPreview] = useState<string | null>(null);

  const attList = email?.attList || [];
  const recipients = useMemo(() => formatRecipients(email?.recipient), [email?.recipient]);

  useEffect(() => {
    if (email && selected.showUnread && email.unread === EmailUnreadEnum.UNREAD) {
      email.unread = EmailUnreadEnum.READ;
      emailRead([email.emailId]).catch(() => null);
    }
  }, [email?.emailId]);

  if (!email) {
    return (
      <div className="surface-card flex h-full items-center justify-center rounded-[24px] text-muted">
        {t('noMessagesFound')}
      </div>
    );
  }

  async function changeStar() {
    if (!email) return;
    const next = email.isStar ? 0 : 1;
    email.isStar = next;
    selectEmail({ ...selected, email: { ...email } });
    setStarChanged(email.emailId, next as 0 | 1);
    if (next) await starAdd(email.emailId);
    else await starCancel(email.emailId);
  }

  async function remove() {
    if (!email) return;
    if (selected.delType === 'physics') await allEmailDelete(email.emailId);
    else await emailDelete(email.emailId);
    setDeleteIds([email.emailId]);
    selectEmail({ ...selected, email: null });
    notifySuccess(t('delSuccessMsg'));
    onBack?.();
  }

  return (
    <article className="surface-card flex h-full flex-col overflow-hidden rounded-[24px]">
      <header className="flex min-h-16 items-center justify-between px-5">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button className="icon-button message-detail-back-button" onClick={onBack} type="button">
              <ArrowLeft className="size-5" />
            </button>
          ) : null}
          {hasPerm('email:delete') ? (
            <Tooltip content={t('delete')}>
              <ConfirmButton
                className="icon-button"
                description={t('deleteEmailConfirmDescription')}
                isIconOnly
                onConfirm={remove}
                title={t('deleteEmailConfirmTitle')}
                variant="tertiary"
              >
                <Trash2 className="size-5" />
              </ConfirmButton>
            </Tooltip>
          ) : null}
          {selected.showStar ? (
            <Tooltip content={email.isStar ? t('unstar') : t('star')}>
              <button className="icon-button" onClick={changeStar} type="button">
                <Star className={`size-5 ${email.isStar ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            </Tooltip>
          ) : null}
        </div>
        <div className="text-sm text-muted">1 of 1</div>
      </header>

      <div className="flex-1 overflow-auto px-7 py-7">
        <h1 className="mb-9 text-[28px] font-semibold leading-tight">{email.subject || t('subject')}</h1>
        <div className="mb-9 flex items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar className="mail-avatar size-14 shrink-0" style={{ background: colorFor(email.sendEmail || email.name) }}>
              <Avatar.Fallback>{initials(email.name || email.sendEmail)}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold">{email.name || email.sendEmail}</div>
              <div className="truncate text-muted">{email.sendEmail}</div>
              <div className="truncate text-muted">{recipients ? `${t('recipient')}: ${recipients}` : ''}</div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm text-muted">{formatDetailDate(email.createTime)}</div>
            <div className="mt-4 flex justify-end gap-2">
              {selected.showReply && hasPerm('email:send') ? (
                <>
                  <button className="icon-button" onClick={() => openComposer({ mode: 'reply', email })} type="button">
                    <Reply className="size-5" />
                  </button>
                  <button className="icon-button" onClick={() => openComposer({ mode: 'forward', email })} type="button">
                    <Reply className="size-5 rotate-180" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="max-w-[980px] text-[17px] leading-8">
          {email.content ? (
            <ShadowHtml html={formatMailContent(email.content)} />
          ) : (
            <pre className="whitespace-pre-wrap font-inherit">{email.text}</pre>
          )}
        </div>

        {attList.length ? (
          <div className="mt-10 max-w-2xl rounded-2xl border border-separator p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">{t('attachments')}</span>
              <span className="text-sm text-muted">{t('attCount', { total: attList.length })}</span>
            </div>
            <div className="space-y-2">
              {attList.map((att) => (
                <div className="flex items-center gap-3 rounded-xl bg-surface-secondary px-3 py-2" key={att.attId || att.key}>
                  <button
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => (isImage(att.filename) ? setPreview(cvtR2Url(att.key)) : null)}
                    type="button"
                  >
                    <span className="font-medium">{att.filename}</span>
                    <span className="ml-3 text-sm text-muted">{formatBytes(att.size)}</span>
                  </button>
                  <a className="icon-button" download href={cvtR2Url(att.key)}>
                    <Download className="size-5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {preview ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6" onClick={() => setPreview(null)}>
          <img alt="attachment preview" className="max-h-full max-w-full rounded-xl object-contain" src={preview} />
        </div>
      ) : null}
    </article>
  );
}
