import http from '@/lib/http';

export function roleAdd(params: any) {
  return http.post('/role/add', params);
}

export function rolePermTree() {
  return http.get('/role/tree');
}

export function roleRoleList() {
  return http.get('/role/list');
}

export function roleSet(params: any) {
  return http.put('/role/set', params);
}

export function roleDelete(roleId: number) {
  return http.delete('/role/delete', { params: { roleId } });
}

export function roleSetDef(roleId: number) {
  return http.put('/role/setDefault', { roleId });
}

export function roleSelectUse() {
  return http.get('/role/selectUse');
}
