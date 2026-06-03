import http from '@/lib/http';

export function emailList(
  accountId: number,
  allReceive: number | undefined,
  emailId = 0,
  timeSort = 0,
  size = 50,
  type = 0,
) {
  return http.get('/email/list', {
    params: { accountId, allReceive, emailId, timeSort, size, type },
  });
}

export function emailDelete(emailIds: number[] | number) {
  return http.delete(`/email/delete?emailIds=${emailIds}`);
}

export function emailLatest(emailId: number, accountId: number, allReceive?: number) {
  return http.get('/email/latest', {
    params: { emailId, accountId, allReceive },
    noMsg: true,
    timeout: 35 * 1000,
  } as any);
}

export function emailRead(emailIds: number[] | number) {
  return http.put('/email/read', { emailIds });
}

export function emailSend(form: any, progress?: (e: ProgressEvent) => void) {
  return http.post('/email/send', form, {
    onUploadProgress: (e) => progress?.(e as unknown as ProgressEvent),
    noMsg: true,
  } as any);
}
