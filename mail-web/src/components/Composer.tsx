import { Button, Spinner } from '@heroui/react';
import { Paperclip, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { emailSend } from '@/api/email';
import { fileToBase64, formatBytes, formatDetailDate, formatMailContent, isEmail } from '@/lib/utils';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notify';
import { getDb, type DraftRow } from '@/lib/db';
import { useAppStore } from '@/store/app-store';

declare global {
  interface Window {
    tinymce?: any;
  }
}

function loadTinyMce() {
  return new Promise<void>((resolve, reject) => {
    if (window.tinymce) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = '/tinymce/tinymce.min.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function Composer() {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const composer = useAppStore((state) => state.composer);
  const closeComposer = useAppStore((state) => state.closeComposer);
  const currentAccount = useAppStore((state) => state.currentAccount);
  const user = useAppStore((state) => state.user);
  const addRecipientRecord = useAppStore((state) => state.addRecipientRecord);
  const sendRecipientRecord = useAppStore((state) => state.sendRecipientRecord);
  const [receiveInput, setReceiveInput] = useState('');
  const [receiveEmail, setReceiveEmail] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  const sender = useMemo(() => {
    if (currentAccount?.email) {
      return {
        sendEmail: currentAccount.email,
        accountId: currentAccount.accountId,
        name: currentAccount.name || user.name || currentAccount.email,
      };
    }
    return {
      sendEmail: user.email,
      accountId: user.account?.accountId,
      name: user.name || user.email,
    };
  }, [currentAccount, user]);

  useEffect(() => {
    if (!composer.open) return;
    const source = composer.email;
    const draft = composer.draft as DraftRow | undefined;

    if (composer.mode === 'reply' && source) {
      setReceiveEmail([source.sendEmail].filter(Boolean));
      setSubject(
        source.subject?.match(/^(Re:|Re：|回复：|回复:)/)
          ? source.subject
          : `Re: ${source.subject || ''}`,
      );
      setContent(
        `<div></div><br><div>${formatDetailDate(source.createTime)} ${source.name || ''} &lt;${
          source.sendEmail
        }&gt; ${t('wrote')}:</div><blockquote style="margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex;">${
          formatMailContent(source.content) || `<pre>${source.text || ''}</pre>`
        }</blockquote>`,
      );
    } else if (composer.mode === 'forward' && source) {
      setReceiveEmail([]);
      setSubject(source.subject || '');
      setContent(formatMailContent(source.content) || `<pre>${source.text || ''}</pre>`);
    } else if (composer.mode === 'draft' && draft) {
      setReceiveEmail(draft.receiveEmail || []);
      setSubject(draft.subject || '');
      setContent(draft.content || '');
      setText(draft.text || '');
      setAttachments(draft.attachments || []);
    } else {
      setReceiveEmail([]);
      setSubject('');
      setContent('');
      setText('');
      setAttachments([]);
    }
  }, [composer.open, composer.mode, composer.email, composer.draft, t]);

  useEffect(() => {
    if (!composer.open || !editorRef.current) return;
    let removed = false;
    loadTinyMce()
      .then(() => {
        if (removed || !editorRef.current) return;
        const id = editorRef.current.id;
        window.tinymce?.remove(`#${id}`);
        window.tinymce?.init({
          selector: `#${id}`,
          height: 330,
          menubar: false,
          branding: false,
          promotion: false,
          statusbar: false,
          language: useAppStore.getState().lang === 'zh' ? 'zh_CN' : undefined,
          plugins: 'link lists table image code',
          toolbar:
            'undo redo | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | link table image code',
          setup(editor: any) {
            editor.on('init', () => editor.setContent(content || ''));
            editor.on('change keyup', () => {
              setContent(editor.getContent());
              setText(editor.getContent({ format: 'text' }));
            });
          },
        });
      })
      .catch(() => null);
    return () => {
      removed = true;
      if (editorRef.current) window.tinymce?.remove(`#${editorRef.current.id}`);
    };
  }, [composer.open]);

  function addRecipients(raw: string) {
    const emails = raw
      .split(/[,，\s]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const valid = emails.filter(isEmail);
    if (valid.length !== emails.length) notifyWarning(t('notEmailMsg'));
    setReceiveEmail((current) => Array.from(new Set([...current, ...valid])));
    setReceiveInput('');
  }

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      const content = await fileToBase64(file);
      setAttachments((current) => [
        ...current,
        { content, filename: file.name, size: file.size, contentType: file.type },
      ]);
    }
    event.target.value = '';
  }

  async function saveDraft() {
    const db = getDb(user.email);
    await db.draft.add({
      createTime: Date.now(),
      sendEmail: sender.sendEmail,
      accountId: sender.accountId,
      name: sender.name,
      receiveEmail,
      subject,
      content,
      text,
      attachments,
      sendType: composer.mode,
      emailId: composer.email?.emailId || 0,
    });
    notifySuccess(t('saveSuccessMsg'));
    closeComposer();
  }

  async function send() {
    const editor = window.tinymce?.activeEditor;
    const html = editor?.getContent?.() || content;
    const plain = editor?.getContent?.({ format: 'text' }) || text;

    if (!receiveEmail.length) return notifyError(t('emptyRecipientMsg'));
    if (!subject) return notifyError(t('emptySubjectMsg'));
    if (!html) return notifyError(t('emptyContentMsg'));

    setSending(true);
    setProgress(0);
    try {
      const form = {
        ...sender,
        receiveEmail,
        subject,
        content: html,
        text: plain,
        attachments,
        sendType: composer.mode === 'reply' || composer.mode === 'forward' ? composer.mode : '',
        emailId: composer.email?.emailId || 0,
      };
      await emailSend(form, (event: any) => {
        if (event.total) setProgress(Math.round((event.loaded * 98) / event.total));
      });
      addRecipientRecord(receiveEmail);
      notifySuccess(t('sendSuccessMsg'), subject);
      closeComposer();
    } catch (error: any) {
      notifyError(t('sendFailMsg'), error?.message);
    } finally {
      setSending(false);
      setProgress(0);
    }
  }

  if (!composer.open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/25">
      <div className="absolute bottom-4 right-4 top-4 flex w-[min(760px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl bg-overlay text-overlay-foreground shadow-overlay">
        <div className="flex min-h-14 items-center justify-between border-b border-separator px-4">
          <div className="min-w-0 truncate font-semibold">
            {composer.mode === 'reply' ? t('reply') : composer.mode === 'forward' ? t('forward') : t('newEmail')}
          </div>
          <button className="icon-button" onClick={closeComposer} type="button">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-4">
          <div className="rounded-xl bg-surface-secondary px-3 py-2 text-sm">
            {t('sender')}: <span className="font-semibold">{sender.name}</span>{' '}
            <span className="text-muted">&lt;{sender.sendEmail}&gt;</span>
          </div>

          <div className="rounded-xl border border-border px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-2">
              {receiveEmail.map((email) => (
                <span className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent-soft-foreground" key={email}>
                  {email}
                  <button
                    className="ml-2"
                    onClick={() => setReceiveEmail((items) => items.filter((item) => item !== email))}
                    type="button"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="min-w-0 flex-1 bg-transparent outline-none"
                list="recent-recipients"
                onBlur={() => receiveInput && addRecipients(receiveInput)}
                onChange={(event) => setReceiveInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault();
                    addRecipients(receiveInput);
                  }
                }}
                placeholder={t('recipient')}
                value={receiveInput}
              />
              <UserPlus className="size-5 text-muted" />
              <datalist id="recent-recipients">
                {sendRecipientRecord.map((email) => (
                  <option key={email} value={email} />
                ))}
              </datalist>
            </div>
          </div>

          <input
            className="w-full rounded-xl border border-border bg-transparent px-3 py-3 outline-none focus:border-focus"
            onChange={(event) => setSubject(event.target.value)}
            placeholder={t('subject')}
            value={subject}
          />

          <textarea className="hidden" defaultValue={content} id="composer-editor" ref={editorRef} />

          {attachments.length ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              {attachments.map((att, index) => (
                <div className="flex items-center gap-3 rounded-lg bg-surface-secondary px-3 py-2" key={`${att.filename}-${index}`}>
                  <Paperclip className="size-4" />
                  <span className="min-w-0 flex-1 truncate">{att.filename}</span>
                  <span className="text-sm text-muted">{formatBytes(att.size)}</span>
                  <button
                    className="icon-button size-7"
                    onClick={() => setAttachments((items) => items.filter((_, idx) => idx !== index))}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-separator p-4">
          <div className="flex items-center gap-2">
            <label className="icon-button cursor-pointer">
              <Paperclip className="size-5" />
              <input className="hidden" multiple onChange={chooseFile} type="file" />
            </label>
            <button className="icon-button" onClick={() => window.tinymce?.activeEditor?.setContent('')} type="button">
              <Trash2 className="size-5" />
            </button>
            {sending ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner size="sm" />
                {progress}%
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button isDisabled={sending} variant="secondary" onPress={saveDraft}>
              {t('drafts')}
            </Button>
            <Button isPending={sending} onPress={send}>
              {composer.mode === 'reply' ? t('reply') : composer.mode === 'forward' ? t('forward') : t('send')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
