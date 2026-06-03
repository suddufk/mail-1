import http from '@/lib/http';

export function login(email: string, password: string) {
  return http.post('/login', { email, password });
}

export function logout() {
  return http.delete('/logout');
}

export function register(form: any) {
  return http.post('/register', form);
}
