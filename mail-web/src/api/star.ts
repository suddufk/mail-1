import http from '@/lib/http';

export function starAdd(emailId: number) {
  return http.post('/star/add', { emailId });
}

export function starCancel(emailId: number) {
  return http.delete('/star/cancel', { params: { emailId } });
}

export function starList(emailId = 0, size = 50) {
  return http.get('/star/list', { params: { emailId, size } });
}
