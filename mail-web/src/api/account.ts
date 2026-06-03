import http from '@/lib/http';

export function accountList(accountId = 0, size = 30, lastSort?: number | null) {
  return http.get('/account/list', { params: { accountId, size, lastSort } });
}

export function accountAdd(email: string, token = '') {
  return http.post('/account/add', { email, token });
}

export function accountSetName(accountId: number, name: string) {
  return http.put('/account/setName', { name, accountId });
}

export function accountDelete(accountId: number) {
  return http.delete('/account/delete', { params: { accountId } });
}

export function accountSetAllReceive(accountId: number) {
  return http.put('/account/setAllReceive', { accountId });
}

export function accountSetAsTop(accountId: number) {
  return http.put('/account/setAsTop', { accountId });
}
