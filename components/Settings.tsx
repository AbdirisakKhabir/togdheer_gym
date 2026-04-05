'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Settings as SettingsIcon, Shield, Key, Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: { permission: Permission }[];
}

interface User {
  id: number;
  username: string;
  role: string;
  memberAccess: string;
  createdAt: string;
  updatedAt: string;
}

type Tab = 'roles' | 'permissions' | 'users';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showUserRoleModal, setShowUserRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissionIds: [] as number[] });
  const [permissionForm, setPermissionForm] = useState({ code: '', name: '', description: '' });
  const [userRoleForm, setUserRoleForm] = useState({ role: '', memberAccess: 'both' });

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) setRoles(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/permissions');
      if (res.ok) setPermissions(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRoles(), fetchPermissions(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  const openRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({
        name: role.name,
        description: role.description || '',
        permissionIds: role.permissions.map((rp) => rp.permission.id),
      });
    } else {
      setEditingRole(null);
      setRoleForm({ name: '', description: '', permissionIds: [] });
    }
    setShowRoleModal(true);
  };

  const openPermissionModal = (perm?: Permission) => {
    if (perm) {
      setEditingPermission(perm);
      setPermissionForm({ code: perm.code, name: perm.name, description: perm.description || '' });
    } else {
      setEditingPermission(null);
      setPermissionForm({ code: '', name: '', description: '' });
    }
    setShowPermissionModal(true);
  };

  const openUserRoleModal = (user: User) => {
    setEditingUser(user);
    setUserRoleForm({ role: user.role, memberAccess: user.memberAccess || 'both' });
    setShowUserRoleModal(true);
  };

  const saveRole = async () => {
    if (!roleForm.name.trim()) {
      Swal.fire({ icon: 'error', title: 'Name required', text: 'Role name is required.', timer: 2000, showConfirmButton: false });
      return;
    }
    setSaving(true);
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';
      const body = editingRole
        ? { name: roleForm.name, description: roleForm.description || null, permissionIds: roleForm.permissionIds }
        : { name: roleForm.name, description: roleForm.description || null, permissionIds: roleForm.permissionIds };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save role');
      }
      await fetchRoles();
      setShowRoleModal(false);
      Swal.fire({ icon: 'success', title: 'Saved', text: `Role ${roleForm.name} saved.`, timer: 2000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Failed to save.', timer: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (role: Role) => {
    const ok = await Swal.fire({ title: 'Delete role?', text: `Delete "${role.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' });
    if (!ok.isConfirmed) return;
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchRoles();
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 2000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete role.', timer: 3000 });
    }
  };

  const savePermission = async () => {
    if (!permissionForm.code.trim() || !permissionForm.name.trim()) {
      Swal.fire({ icon: 'error', title: 'Required', text: 'Code and name are required.', timer: 2000, showConfirmButton: false });
      return;
    }
    setSaving(true);
    try {
      const url = editingPermission ? `/api/permissions/${editingPermission.id}` : '/api/permissions';
      const method = editingPermission ? 'PUT' : 'POST';
      const body = { code: permissionForm.code, name: permissionForm.name, description: permissionForm.description || null };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save permission');
      }
      await fetchPermissions();
      setShowPermissionModal(false);
      Swal.fire({ icon: 'success', title: 'Saved', text: 'Permission saved.', timer: 2000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Failed to save.', timer: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const deletePermission = async (perm: Permission) => {
    const ok = await Swal.fire({ title: 'Delete permission?', text: `Delete "${perm.code}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' });
    if (!ok.isConfirmed) return;
    try {
      const res = await fetch(`/api/permissions/${perm.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchPermissions();
      await fetchRoles();
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 2000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete permission.', timer: 3000 });
    }
  };

  const saveUserRole = async () => {
    if (!editingUser || !userRoleForm.role.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: userRoleForm.role, memberAccess: userRoleForm.memberAccess }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user role');
      }
      await fetchUsers();
      setShowUserRoleModal(false);
      Swal.fire({ icon: 'success', title: 'Updated', text: `Role updated for ${editingUser.username}.`, timer: 2000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Failed to update.', timer: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const togglePermissionInRole = (permId: number) => {
    setRoleForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter((id) => id !== permId)
        : [...prev.permissionIds, permId],
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-2">
          {[
            { key: 'roles' as Tab, label: 'Roles', icon: Shield },
            { key: 'permissions' as Tab, label: 'Permissions', icon: Key },
            { key: 'users' as Tab, label: 'User Permissions', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'roles' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Roles</h3>
                  <p className="text-sm text-gray-500">Assign permissions to roles. Users get permissions via their role.</p>
                </div>
                <button onClick={() => openRoleModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600">
                  <Plus className="w-4 h-4" />
                  Add Role
                </button>
              </div>
              <div className="space-y-3">
                {roles.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                    <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No roles yet. Run the seed script to add default roles:</p>
                    <code className="block mt-2 text-xs text-gray-600">node prisma/seed-roles-permissions.js</code>
                  </div>
                ) : (
                  roles.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-semibold text-gray-700">{r.name}</p>
                        <p className="text-sm text-gray-500">{r.description || 'No description'}</p>
                        <p className="text-xs text-gray-400 mt-1">{r.permissions.length} permissions</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openRoleModal(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteRole(r)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Permissions</h3>
                  <p className="text-sm text-gray-500">Define permission codes used in the app.</p>
                </div>
                <button onClick={() => openPermissionModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600">
                  <Plus className="w-4 h-4" />
                  Add Permission
                </button>
              </div>
              <div className="space-y-3">
                {permissions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                    <Key className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No permissions yet. Run the seed script to add default permissions.</p>
                  </div>
                ) : (
                  permissions.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-mono text-sm font-medium text-gray-700">{p.code}</p>
                        <p className="text-sm text-gray-600">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openPermissionModal(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePermission(p)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">User Permissions</h3>
                <p className="text-sm text-gray-500">Change user role and gender access (male, female, or both).</p>
              </div>
              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">No users yet.</div>
                ) : (
                  users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-semibold text-gray-700">{u.username}</p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          {u.role}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-1 ml-2">
                          {u.memberAccess === 'male' ? 'Male Only' : u.memberAccess === 'female' ? 'Female Only' : 'Male + Female'}
                        </span>
                      </div>
                      <button onClick={() => openUserRoleModal(u)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">
                        <Pencil className="w-3 h-3" />
                        Edit Role
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">{editingRole ? 'Edit Role' : 'Add Role'}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. staff"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
                  {permissions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roleForm.permissionIds.includes(p.id)}
                        onChange={() => togglePermissionInRole(p.id)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm font-mono">{p.code}</span>
                      <span className="text-sm text-gray-500">- {p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={() => setShowRoleModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveRole} disabled={saving} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">{editingPermission ? 'Edit Permission' : 'Add Permission'}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={permissionForm.code}
                  onChange={(e) => setPermissionForm((p) => ({ ...p, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. members:view"
                  disabled={!!editingPermission}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={permissionForm.name}
                  onChange={(e) => setPermissionForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. View Members"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={permissionForm.description}
                  onChange={(e) => setPermissionForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={() => setShowPermissionModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={savePermission} disabled={saving} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Role Modal */}
      {showUserRoleModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit Role for {editingUser.username}</h3>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={userRoleForm.role}
                onChange={(e) => setUserRoleForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
              <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">Member Gender Access</label>
              <select
                value={userRoleForm.memberAccess}
                onChange={(e) => setUserRoleForm((p) => ({ ...p, memberAccess: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="male">Male Only</option>
                <option value="female">Female Only</option>
                <option value="both">Male and Female</option>
              </select>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={() => setShowUserRoleModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveUserRole} disabled={saving} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
