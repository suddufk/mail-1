import http from '@/lib/http';

export function allEmailList(params: any) {
  return http.get('/allEmail/list', { params: { ...params } });
}

export function allEmailDelete(emailIds: number[] | number) {
  return http.delete(`/allEmail/delete?emailIds=${emailIds}`);
}

export function allEmailBatchDelete(params: any) {
  return http.delete('/allEmail/batchDelete', { params });
}

export function allEmailLatest(emailId: number) {
  return http.get('/allEmail/latest', {
    params: { emailId },
    noMsg: true,
    timeout: 35 * 1000,
  } as any);
}
