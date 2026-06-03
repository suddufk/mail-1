import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { useAppStore } from '@/store/app-store';

dayjs.extend(relativeTime);

export const EmailUnreadEnum = {
  READ: 0,
  UNREAD: 1,
} as const;

export function fromNow(value?: string | number) {
  if (!value) return '';
  const lang = useAppStore.getState().lang;
  dayjs.locale(lang === 'zh' ? 'zh-cn' : 'en');
  return dayjs(value).fromNow();
}

export function formatDetailDate(value?: string | number) {
  if (!value) return '';
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}

export function getExtName(fileName = '') {
  const index = fileName.lastIndexOf('.');
  return index !== -1 ? fileName.slice(index + 1).toLowerCase() : '';
}

export function formatBytes(bytes = 0) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

export function fileToBase64(file: File, keepDataUrl = false) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(keepDataUrl ? result : result.split(',')[1] || '');
    };
    reader.onerror = reject;
  });
}

export function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function cvtR2Url(key?: string) {
  if (!key) return '';
  if (key.startsWith('https://') || key.startsWith('http://') || key.startsWith('data:')) return key;

  let domain = useAppStore.getState().settings.r2Domain || '';
  if (!domain) return key;
  if (!domain.startsWith('http')) domain = `https://${domain}`;
  if (domain.endsWith('/')) domain = domain.slice(0, -1);
  return `${domain}/${key}`;
}

export function toOssDomain(domain?: string) {
  if (!domain) return '';
  let next = domain;
  if (!next.startsWith('http')) next = `https://${next}`;
  if (next.endsWith('/')) next = next.slice(0, -1);
  return next;
}

export function htmlToText(html?: string, text?: string) {
  if (!html) return cleanSpace(text || '');
  const temp = document.createElement('div');
  temp.innerHTML = html.replace(/<(img|iframe|object|embed|video|audio|source|link)[^>]*>/gi, '');
  temp.querySelectorAll('script, style, title').forEach((el) => el.remove());
  return cleanSpace(temp.textContent || temp.innerText || '');
}

export function cleanSpace(text = '') {
  return text
    .replace(/[\u200B-\u200F\uFEFF\u034F\u00A0\u3000\u00AD]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatRecipients(recipient?: string) {
  if (!recipient) return '';
  try {
    const list = JSON.parse(recipient);
    return Array.isArray(list) ? list.map((item) => item.address).join(', ') : recipient;
  } catch {
    return recipient;
  }
}

export function formatMailContent(content?: string) {
  const domain = useAppStore.getState().settings.r2Domain;
  return (content || '').replace(/{{domain}}/g, `${toOssDomain(domain)}/`);
}

export function initials(value?: string) {
  const text = value || '';
  return text.trim().slice(0, 1).toUpperCase() || 'M';
}

export function colorFor(value?: string) {
  const colors = [
    'from-emerald-200 to-teal-500',
    'from-blue-200 to-indigo-500',
    'from-amber-200 to-orange-500',
    'from-zinc-200 to-zinc-900',
    'from-cyan-200 to-blue-500',
    'from-green-200 to-emerald-500',
    'from-violet-200 to-fuchsia-500',
    'from-rose-100 to-red-400',
  ];
  const code = [...(value || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[code % colors.length];
}
