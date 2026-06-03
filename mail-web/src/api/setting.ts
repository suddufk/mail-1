import http from '@/lib/http';

export function settingSet(setting: any) {
  return http.put('/setting/set', setting);
}

export function settingQuery() {
  return http.get('/setting/query');
}

export function websiteConfig() {
  return http.get('/setting/websiteConfig');
}

export function setBackground(background: string) {
  return http.put('/setting/setBackground', { background });
}

export function deleteBackground() {
  return http.delete('/setting/deleteBackground');
}

export function setBlackList(params: any) {
  return http.put('/setting/setBlacklist', params);
}
