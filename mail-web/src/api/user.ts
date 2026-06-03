import http from '@/lib/http';

export function userList(params: any) {
  return http.get('/user/list', { params: { ...params } });
}

export function userSetPwd(params: any) {
  return http.put('/user/setPwd', params);
}

export function userSetStatus(params: any) {
  return http.put('/user/setStatus', params);
}

export function userSetType(params: any) {
  return http.put('/user/setType', params);
}

export function userDelete(userIds: number[] | number) {
  return http.delete('/user/delete', { params: { userIds: `${userIds}` } });
}

export function userAdd(form: any) {
  return http.post('/user/add', form);
}

export function userRestSendCount(userId: number) {
  return http.put('/user/resetSendCount', { userId });
}

export function userRestore(userId: number, type: string) {
  return http.put('/user/restore', { userId, type });
}

export function userAllAccount(userId: number, num = 0, size = 30) {
  return http.get('/user/allAccount', { params: { userId, num, size } });
}

export function userDeleteAccount(accountId: number) {
  return http.delete('/user/deleteAccount', { params: { accountId } });
}
