import http from '@/lib/http';

export function regKeyList(params: any) {
  return http.get('/regKey/list', { params: { ...params } });
}

export function regKeyAdd(form: any) {
  return http.post('/regKey/add', form);
}

export function regKeyDelete(regKeyIds: number[] | number) {
  return http.delete(`/regKey/delete?regKeyIds=${regKeyIds}`);
}

export function regKeyClearNotUse() {
  return http.delete('/regKey/clearNotUse');
}

export function regKeyHistory(regKeyId: number) {
  return http.get('/regKey/history', { params: { regKeyId } });
}
