import { Button, Spinner, Table } from '@heroui/react';
import {
  Edit3,
  History,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { regKeyAdd, regKeyClearNotUse, regKeyDelete, regKeyHistory, regKeyList } from '@/api/reg-key';
import {
  roleAdd,
  roleDelete,
  rolePermTree,
  roleRoleList,
  roleSelectUse,
  roleSet,
  roleSetDef,
} from '@/api/role';
import {
  userAdd,
  userAllAccount,
  userDelete,
  userDeleteAccount,
  userList,
  userRestore,
  userRestSendCount,
  userSetPwd,
  userSetStatus,
  userSetType,
} from '@/api/user';
import ConfirmButton from '@/components/ConfirmButton';
import { HeroSelectField } from '@/components/HeroFormControls';
import SideDrawer from '@/components/SideDrawer';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import { notifyError, notifySuccess } from '@/lib/notify';
import { isEmail } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

type Resource = 'users' | 'roles' | 'regKeys';
type DrawerState =
  | null
  | { type: 'user-add' }
  | { type: 'user-edit'; row: any }
  | { type: 'user-accounts'; row: any }
  | { type: 'role-add' }
  | { type: 'role-edit'; row: any }
  | { type: 'regkey-add' }
  | { type: 'regkey-history'; row: any };

const config: Record<Resource, any> = {
  users: {
    titleKey: 'allUsers',
    columns: ['userId', 'email', 'name', 'roleName', 'status', 'createTime'],
    searchKey: 'email',
  },
  roles: {
    titleKey: 'permissions',
    columns: ['roleId', 'name', 'description', 'isDefault', 'sendType', 'sendCount', 'accountCount'],
    searchKey: 'name',
  },
  regKeys: {
    titleKey: 'inviteCode',
    columns: ['regKeyId', 'code', 'roleName', 'count', 'expireTime', 'createTime'],
    searchKey: 'code',
  },
};

function asList(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function compact(value: any) {
  if (value == null) return '';
  if (typeof value === 'object') return Array.isArray(value) ? value.join(', ') : JSON.stringify(value);
  return String(value);
}

function splitList(value = '') {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function flattenPermTree(nodes: any[], depth = 0): any[] {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenPermTree(node.children || node.child || node.list || [], depth + 1),
  ]);
}

export default function ManagementPage({ resource }: { resource: Resource }) {
  const { t } = useTranslation();
  const cfg = config[resource];
  const domainList = useAppStore((state) => state.domainList);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [permTree, setPermTree] = useState<any[]>([]);
  const [roleOptions, setRoleOptions] = useState<any[]>([]);
  const [accountRows, setAccountRows] = useState<any[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [userForm, setUserForm] = useState({ emailPrefix: '', suffix: '', password: '', roleId: '' });
  const [userEditForm, setUserEditForm] = useState({ password: '', roleId: '', status: '' });
  const [roleForm, setRoleForm] = useState({
    roleId: 0,
    name: '',
    description: '',
    banEmail: '',
    availDomain: '',
    sort: 0,
    sendType: 'count',
    sendCount: 0,
    accountCount: 0,
    permIds: [] as number[],
  });
  const [regKeyForm, setRegKeyForm] = useState({ code: '', roleId: '', expireTime: '', count: 1 });

  const columns = useMemo(() => cfg.columns, [cfg.columns]);
  const flatPerms = useMemo(() => flattenPermTree(permTree), [permTree]);
  const displayedRows = useMemo(() => {
    if (resource !== 'roles' || !search.trim()) return rows;
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) =>
      [row.name, row.description, row.roleName].some((value) => String(value || '').toLowerCase().includes(keyword)),
    );
  }, [resource, rows, search]);

  async function fetchRows() {
    setLoading(true);
    try {
      if (resource === 'users') {
        const data: any = await userList({ email: search, num: 0, size: 50 });
        const roles: any = await roleSelectUse().catch(() => []);
        setRows(asList(data));
        setRoleOptions(Array.isArray(roles) ? roles : asList(roles));
        setTotal(data?.total || asList(data).length);
      }
      if (resource === 'roles') {
        const [data, tree]: any[] = await Promise.all([roleRoleList(), rolePermTree().catch(() => [])]);
        setRows(asList(data));
        setPermTree(Array.isArray(tree) ? tree : asList(tree));
        setTotal(asList(data).length);
      }
      if (resource === 'regKeys') {
        const [data, roles]: any[] = await Promise.all([
          regKeyList({ code: search, num: 0, size: 50 }),
          roleSelectUse().catch(() => []),
        ]);
        setRows(asList(data));
        setRoleOptions(Array.isArray(roles) ? roles : asList(roles));
        setTotal(data?.total || asList(data).length);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, [resource]);

  useEffect(() => {
    if (!userForm.suffix && domainList.length) setUserForm((form) => ({ ...form, suffix: domainList[0] }));
  }, [domainList, userForm.suffix]);

  function closeDrawer() {
    setDrawer(null);
  }

  function openAdd() {
    if (resource === 'users') {
      setUserForm({ emailPrefix: '', suffix: domainList[0] || '', password: '', roleId: String(roleOptions[0]?.roleId || '') });
      setDrawer({ type: 'user-add' });
    }
    if (resource === 'roles') {
      setRoleForm({
        roleId: 0,
        name: '',
        description: '',
        banEmail: '',
        availDomain: '',
        sort: 0,
        sendType: 'count',
        sendCount: 0,
        accountCount: 0,
        permIds: [],
      });
      setDrawer({ type: 'role-add' });
    }
    if (resource === 'regKeys') {
      setRegKeyForm({ code: '', roleId: String(roleOptions[0]?.roleId || ''), expireTime: '', count: 1 });
      setDrawer({ type: 'regkey-add' });
    }
  }

  function openEditUser(row: any) {
    setUserEditForm({
      password: '',
      roleId: String(row.roleId || row.type || ''),
      status: String(row.status ?? ''),
    });
    setDrawer({ type: 'user-edit', row });
  }

  function openEditRole(row: any) {
    setRoleForm({
      roleId: row.roleId || 0,
      name: row.name || '',
      description: row.description || '',
      banEmail: Array.isArray(row.banEmail) ? row.banEmail.join(', ') : row.banEmail || '',
      availDomain: Array.isArray(row.availDomain) ? row.availDomain.join(', ') : row.availDomain || '',
      sort: Number(row.sort || 0),
      sendType: row.sendType || 'count',
      sendCount: Number(row.sendCount || 0),
      accountCount: Number(row.accountCount || 0),
      permIds: row.permIds || row.permKeys || [],
    });
    setDrawer({ type: 'role-edit', row });
  }

  async function submitUser() {
    const email = `${userForm.emailPrefix}${userForm.suffix}`;
    if (!isEmail(email)) return notifyError(t('notEmailMsg'));
    if (!userForm.password) return notifyError(t('emptyPwdMsg'));
    await userAdd({ email, password: userForm.password, roleId: Number(userForm.roleId || 0) });
    notifySuccess(t('addSuccessMsg'));
    closeDrawer();
    fetchRows();
  }

  async function submitUserEdit() {
    if (!drawer || drawer.type !== 'user-edit') return;
    const userId = drawer.row.userId;
    if (userEditForm.password) await userSetPwd({ userId, password: userEditForm.password });
    if (userEditForm.roleId) await userSetType({ userId, roleId: Number(userEditForm.roleId) });
    if (userEditForm.status !== '') await userSetStatus({ userId, status: Number(userEditForm.status) });
    notifySuccess(t('saveSuccessMsg'));
    closeDrawer();
    fetchRows();
  }

  async function submitRole() {
    if (!roleForm.name.trim()) return notifyError(t('emptyRoleNameMsg'));
    const payload = {
      ...roleForm,
      name: roleForm.name.trim(),
      description: roleForm.description.trim(),
      banEmail: splitList(roleForm.banEmail),
      availDomain: splitList(roleForm.availDomain),
      sort: Number(roleForm.sort || 0),
      sendCount: Number(roleForm.sendCount || 0),
      accountCount: Number(roleForm.accountCount || 0),
      permIds: roleForm.permIds,
    };
    if (roleForm.roleId) await roleSet(payload);
    else await roleAdd(payload);
    notifySuccess(roleForm.roleId ? t('saveSuccessMsg') : t('addSuccessMsg'));
    closeDrawer();
    fetchRows();
  }

  async function submitRegKey() {
    await regKeyAdd({
      code: regKeyForm.code,
      roleId: Number(regKeyForm.roleId || 0),
      expireTime: regKeyForm.expireTime || null,
      count: Number(regKeyForm.count || 1),
    });
    notifySuccess(t('addSuccessMsg'));
    closeDrawer();
    fetchRows();
  }

  async function remove(row: any) {
    if (resource === 'users') await userDelete(row.userId);
    if (resource === 'roles') await roleDelete(row.roleId);
    if (resource === 'regKeys') await regKeyDelete(row.regKeyId);
    notifySuccess(t('delSuccessMsg'));
    fetchRows();
  }

  async function loadUserAccounts(row: any) {
    setDrawer({ type: 'user-accounts', row });
    setAccountRows([]);
    setAccountLoading(true);
    try {
      const data: any = await userAllAccount(row.userId, 1, 30);
      setAccountRows(asList(data));
    } finally {
      setAccountLoading(false);
    }
  }

  async function loadRegKeyHistory(row: any) {
    setDrawer({ type: 'regkey-history', row });
    setHistoryRows([]);
    const data: any = await regKeyHistory(row.regKeyId);
    setHistoryRows(asList(data));
  }

  function renderValue(row: any, column: string) {
    if (column === 'status') {
      if (row.isDel === 1) return t('deleted');
      return row.status === 1 ? t('banned') : t('active');
    }
    if (column === 'isDefault' || column === 'defaultRole') return row[column] ? t('enabled') : t('disabled');
    return compact(row[column]);
  }

  return (
    <WorkspaceLayout
      actions={
        <div className="flex gap-2">
          <Button onPress={openAdd}>
            <Plus className="size-4" />
            {t('add')}
          </Button>
          <Button variant="secondary" onPress={fetchRows}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      }
      title={t(cfg.titleKey)}
    >
      <div className="space-y-5">
        <section className="surface-card flex flex-wrap items-center gap-3 rounded-2xl p-4">
          <input
            className="min-w-64 flex-1 rounded-xl border border-border bg-field px-3 py-2 outline-none"
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') fetchRows();
            }}
            placeholder={`${t('search')} ${t(cfg.titleKey)}`}
            value={search}
          />
          <Button onPress={fetchRows}>{t('search')}</Button>
          {resource === 'regKeys' ? (
            <ConfirmButton
              description={t('clearUnusedRegKeysConfirmDescription')}
              onConfirm={async () => {
                await regKeyClearNotUse();
                notifySuccess(t('delSuccessMsg'));
                fetchRows();
              }}
              title={t('clearUnusedRegKeysConfirmTitle')}
              variant="secondary"
            >
              {t('clearUnused')}
            </ConfirmButton>
          ) : null}
          <span className="text-sm text-muted">{total}</span>
        </section>

        <section className="surface-card overflow-hidden rounded-2xl">
          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={t(cfg.titleKey)} className="min-w-[860px]">
                  <Table.Header>
                    {columns.map((column: string) => (
                      <Table.Column id={column} isRowHeader={column === columns[0]} key={column}>
                        {column}
                      </Table.Column>
                    ))}
                    <Table.Column id="actions" className="text-end">
                      {t('action')}
                    </Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {displayedRows.map((row, index) => (
                      <Table.Row id={row.userId || row.roleId || row.regKeyId || index} key={row.userId || row.roleId || row.regKeyId || index}>
                        {columns.map((column: string) => (
                          <Table.Cell className="max-w-[240px]" key={column}>
                            <span className="block truncate" title={compact(row[column])}>
                              {renderValue(row, column)}
                            </span>
                          </Table.Cell>
                        ))}
                        <Table.Cell>
                          <div className="flex justify-end gap-1">
                            {resource === 'users' ? (
                              <>
                                <Button isIconOnly size="sm" variant="tertiary" onPress={() => openEditUser(row)}>
                                  <Edit3 className="size-4" />
                                </Button>
                                <Button isIconOnly size="sm" variant="tertiary" onPress={() => loadUserAccounts(row)}>
                                  <Mail className="size-4" />
                                </Button>
                                <Button isIconOnly size="sm" variant="tertiary" onPress={() => userRestSendCount(row.userId).then(fetchRows)}>
                                  <RotateCcw className="size-4" />
                                </Button>
                              </>
                            ) : null}
                            {resource === 'roles' ? (
                              <>
                                <Button isIconOnly size="sm" variant="tertiary" onPress={() => openEditRole(row)}>
                                  <Edit3 className="size-4" />
                                </Button>
                                <Button isIconOnly size="sm" variant="tertiary" onPress={() => roleSetDef(row.roleId).then(fetchRows)}>
                                  <Star className="size-4" />
                                </Button>
                              </>
                            ) : null}
                            {resource === 'regKeys' ? (
                              <Button isIconOnly size="sm" variant="tertiary" onPress={() => loadRegKeyHistory(row)}>
                                <History className="size-4" />
                              </Button>
                            ) : null}
                            <ConfirmButton
                              description={t('deleteRowConfirmDescription', { name: row.email || row.name || row.code || row.roleId })}
                              isIconOnly
                              onConfirm={() => remove(row)}
                              size="sm"
                              title={t('deleteRowConfirmTitle')}
                              variant="danger"
                            >
                              <Trash2 className="size-4" />
                            </ConfirmButton>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </section>
      </div>

      {renderDrawer()}
    </WorkspaceLayout>
  );

  function renderDrawer() {
    if (!drawer) return null;
    if (drawer.type === 'user-add') {
      return (
        <SideDrawer
          footer={
            <>
              <Button onPress={closeDrawer} variant="secondary">
                {t('cancel')}
              </Button>
              <Button onPress={submitUser}>{t('add')}</Button>
            </>
          }
          onOpenChange={(open) => !open && closeDrawer()}
          open
          title={t('addUser')}
        >
          <div className="space-y-4">
            <Field label={t('emailAccount')}>
              <div className="flex overflow-hidden rounded-xl border border-border bg-field">
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
                  onChange={(event) => setUserForm((form) => ({ ...form, emailPrefix: event.target.value }))}
                  value={userForm.emailPrefix}
                />
                <HeroSelectField
                  className="w-40 shrink-0"
                  onChange={(suffix) => setUserForm((form) => ({ ...form, suffix }))}
                  options={domainList.map((domain) => ({ label: domain, value: domain }))}
                  placeholder="@"
                  triggerClassName="h-full rounded-none border-0 bg-transparent px-2 text-sm shadow-none"
                  value={userForm.suffix}
                />
              </div>
            </Field>
            <TextInput label={t('password')} onChange={(password) => setUserForm((form) => ({ ...form, password }))} type="password" value={userForm.password} />
            <SelectInput
              label={t('role')}
              onChange={(roleId) => setUserForm((form) => ({ ...form, roleId }))}
              options={roleOptions.map((role) => ({ label: role.name, value: String(role.roleId) }))}
              value={userForm.roleId}
            />
          </div>
        </SideDrawer>
      );
    }
    if (drawer.type === 'user-edit') {
      return (
        <SideDrawer
          footer={
            <>
              <Button onPress={closeDrawer} variant="secondary">
                {t('cancel')}
              </Button>
              <Button onPress={submitUserEdit}>{t('save')}</Button>
            </>
          }
          onOpenChange={(open) => !open && closeDrawer()}
          open
          title={drawer.row.email || t('editUser')}
        >
          <div className="space-y-4">
            <TextInput label={t('password')} onChange={(password) => setUserEditForm((form) => ({ ...form, password }))} type="password" value={userEditForm.password} />
            <SelectInput
              label={t('role')}
              onChange={(roleId) => setUserEditForm((form) => ({ ...form, roleId }))}
              options={roleOptions.map((role) => ({ label: role.name, value: String(role.roleId) }))}
              value={userEditForm.roleId}
            />
            <SelectInput
              label={t('status')}
              onChange={(status) => setUserEditForm((form) => ({ ...form, status }))}
              options={[
                { label: t('active'), value: '0' },
                { label: t('banned'), value: '1' },
              ]}
              value={userEditForm.status}
            />
            {drawer.row.isDel === 1 ? (
              <Button
                variant="secondary"
                onPress={async () => {
                  await userRestore(drawer.row.userId, 'normal');
                  notifySuccess(t('saveSuccessMsg'));
                  closeDrawer();
                  fetchRows();
                }}
              >
                {t('restore')}
              </Button>
            ) : null}
            <Button variant="secondary" onPress={() => loadUserAccounts(drawer.row)}>
              {t('emailAccount')}
            </Button>
          </div>
        </SideDrawer>
      );
    }
    if (drawer.type === 'user-accounts') {
      return (
        <SideDrawer onOpenChange={(open) => !open && closeDrawer()} open title={`${t('emailAccount')} - ${drawer.row.email}`}>
          {accountLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={t('emailAccount')} className="min-w-[420px]">
                  <Table.Header>
                    <Table.Column isRowHeader>Email</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column className="text-end">{t('action')}</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {accountRows.map((account) => (
                      <Table.Row id={account.accountId} key={account.accountId}>
                        <Table.Cell>{account.email}</Table.Cell>
                        <Table.Cell>{account.isDel ? t('deleted') : t('active')}</Table.Cell>
                        <Table.Cell>
                          <div className="flex justify-end">
                            <ConfirmButton
                              description={t('deleteAccountAddressConfirmDescription', { email: account.email })}
                              isIconOnly
                              onConfirm={async () => {
                                await userDeleteAccount(account.accountId);
                                notifySuccess(t('delSuccessMsg'));
                                loadUserAccounts(drawer.row);
                              }}
                              size="sm"
                              title={t('deleteAccountAddressConfirmTitle')}
                              variant="danger"
                            >
                              <Trash2 className="size-4" />
                            </ConfirmButton>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </SideDrawer>
      );
    }
    if (drawer.type === 'role-add' || drawer.type === 'role-edit') {
      return (
        <SideDrawer
          footer={
            <>
              <Button onPress={closeDrawer} variant="secondary">
                {t('cancel')}
              </Button>
              <Button onPress={submitRole}>{t('save')}</Button>
            </>
          }
          onOpenChange={(open) => !open && closeDrawer()}
          open
          title={drawer.type === 'role-add' ? t('addRole') : t('editRole')}
          widthClass="sm:max-w-[640px]"
        >
          <div className="space-y-4">
            <TextInput label={t('roleName')} onChange={(name) => setRoleForm((form) => ({ ...form, name }))} value={roleForm.name} />
            <TextInput label={t('description')} onChange={(description) => setRoleForm((form) => ({ ...form, description }))} value={roleForm.description} />
            <TextInput label={t('blockedEmails')} onChange={(banEmail) => setRoleForm((form) => ({ ...form, banEmail }))} value={roleForm.banEmail} />
            <TextInput label={t('availableDomains')} onChange={(availDomain) => setRoleForm((form) => ({ ...form, availDomain }))} value={roleForm.availDomain} />
            <NumberInput label={t('sort')} onChange={(sort) => setRoleForm((form) => ({ ...form, sort }))} value={roleForm.sort} />
            <SelectInput
              label={t('sendType')}
              onChange={(sendType) => setRoleForm((form) => ({ ...form, sendType }))}
              options={[
                { label: t('total'), value: 'count' },
                { label: t('daily'), value: 'day' },
                { label: t('sendInternal'), value: 'internal' },
                { label: t('sendBanned'), value: 'ban' },
              ]}
              value={roleForm.sendType}
            />
            <NumberInput label={t('sendLimit')} onChange={(sendCount) => setRoleForm((form) => ({ ...form, sendCount }))} value={roleForm.sendCount} />
            <NumberInput label={t('accountLimit')} onChange={(accountCount) => setRoleForm((form) => ({ ...form, accountCount }))} value={roleForm.accountCount} />
            <div className="rounded-2xl border border-border p-4">
              <div className="mb-3 text-sm font-semibold">{t('rolePermissions')}</div>
              <div className="max-h-72 space-y-2 overflow-auto">
                {flatPerms.map((perm) => (
                  <label className="flex items-center gap-2 text-sm" key={perm.permId || perm.permKey}>
                    <input
                      checked={roleForm.permIds.includes(perm.permId)}
                      onChange={(event) => {
                        const permId = perm.permId;
                        setRoleForm((form) => ({
                          ...form,
                          permIds: event.target.checked
                            ? [...form.permIds, permId]
                            : form.permIds.filter((id) => id !== permId),
                        }));
                      }}
                      type="checkbox"
                    />
                    <span style={{ paddingLeft: `${perm.depth * 16}px` }}>{perm.name || perm.permKey}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SideDrawer>
      );
    }
    if (drawer.type === 'regkey-add') {
      return (
        <SideDrawer
          footer={
            <>
              <Button onPress={closeDrawer} variant="secondary">
                {t('cancel')}
              </Button>
              <Button onPress={submitRegKey}>{t('add')}</Button>
            </>
          }
          onOpenChange={(open) => !open && closeDrawer()}
          open
          title={t('addRegKey')}
        >
          <div className="space-y-4">
            <TextInput label={t('regKey')} onChange={(code) => setRegKeyForm((form) => ({ ...form, code }))} value={regKeyForm.code} />
            <SelectInput
              label={t('role')}
              onChange={(roleId) => setRegKeyForm((form) => ({ ...form, roleId }))}
              options={roleOptions.map((role) => ({ label: role.name, value: String(role.roleId) }))}
              value={regKeyForm.roleId}
            />
            <TextInput label={t('validUntil')} onChange={(expireTime) => setRegKeyForm((form) => ({ ...form, expireTime }))} type="date" value={regKeyForm.expireTime} />
            <NumberInput label={t('remainingUses')} onChange={(count) => setRegKeyForm((form) => ({ ...form, count }))} value={regKeyForm.count} />
          </div>
        </SideDrawer>
      );
    }
    if (drawer.type === 'regkey-history') {
      return (
        <SideDrawer onOpenChange={(open) => !open && closeDrawer()} open title={`${t('history')} - ${drawer.row.code}`}>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label={t('history')} className="min-w-[420px]">
                <Table.Header>
                  <Table.Column isRowHeader>{t('user')}</Table.Column>
                  <Table.Column>{t('date')}</Table.Column>
                </Table.Header>
                <Table.Body>
                  {historyRows.map((item, index) => (
                    <Table.Row id={item.userId || index} key={item.userId || index}>
                      <Table.Cell>{item.email || item.userEmail || item.userId}</Table.Cell>
                      <Table.Cell>{item.createTime}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </SideDrawer>
      );
    }
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <Field label={label}>
      <input
        className="w-full rounded-xl border border-border bg-field px-3 py-2 outline-none"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </Field>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <input
        className="w-full rounded-xl border border-border bg-field px-3 py-2 outline-none"
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </Field>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <HeroSelectField
        onChange={onChange}
        options={options}
        placeholder={label}
        value={value}
      />
    </Field>
  );
}
