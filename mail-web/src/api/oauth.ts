import http from '@/lib/http';

export function oauthLinuxDoLogin(code: string) {
  return http.post('/oauth/linuxDo/login', { code });
}

export function oauthBindUser(form: any) {
  return http.put('/oauth/bindUser', form);
}
