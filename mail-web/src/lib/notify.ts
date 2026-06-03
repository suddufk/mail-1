import { toast } from '@heroui/react';

export function notifySuccess(title: string, description?: string) {
  toast.success(title, { description });
}

export function notifyWarning(title: string, description?: string) {
  toast.warning(title, { description });
}

export function notifyError(title: string, description?: string) {
  toast.danger(title, { description, timeout: 6000 });
}

export function notifyInfo(title: string, description?: string) {
  toast(title, { description });
}
