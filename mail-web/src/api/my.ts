import http from '@/lib/http';

export function loginUserInfo() {
  return http.get('/my/loginUserInfo');
}

export function resetPassword(password: string) {
  return http.put('/my/resetPassword', { password });
}

export function userDelete() {
  return http.delete('/my/delete');
}
