'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, UserX, Loader2, AlertCircle, X,
  ShieldCheck, User, RefreshCw, CheckCircle2,
} from 'lucide-react'
import type { AdminUser, AdminRole } from '@/types/admin.types'

interface FormState {
  username:     string
  display_name: string
  password:     string
  role:         AdminRole
}

const EMPTY_FORM: FormState = {
  username: '', display_name: '', password: '', role: 'staff',
}

const ROLE_CONFIG: Record<AdminRole, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  admin: { label: 'Admin',      cls: 'bg-blue-50 text-[#005BAA]', Icon: ShieldCheck },
  staff: { label: 'Nhân viên',  cls: 'bg-gray-100 text-gray-600', Icon: User },
}

export function StaffTab() {
  const [users,       setUsers]       = useState<AdminUser[]>([])
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [fetchError,  setFetchError]  = useState<string | null>(null)

  const [mode,      setMode]      = useState<'list' | 'create' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)

  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState<string | null>(null)
  const [saveSuccess,  setSaveSuccess]  = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { users: AdminUser[] }
      setUsers(json.users)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Không thể tải danh sách')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d: { user?: AdminUser }) => { if (d.user) setCurrentUser(d.user) })
      .catch(() => null)
  }, [fetchUsers])

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setSaveError(null)
    setSaveSuccess(false)
    setMode('create')
  }

  function openEdit(u: AdminUser) {
    setForm({ username: u.username, display_name: u.display_name, password: '', role: u.role })
    setEditingId(u.id)
    setSaveError(null)
    setSaveSuccess(false)
    setMode('edit')
  }

  function closePanel() {
    setMode('list')
    setSaveError(null)
    setSaveSuccess(false)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      let res: Response

      if (mode === 'create') {
        res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        const payload: Record<string, unknown> = {
          display_name: form.display_name,
          role:         form.role,
        }
        if (form.password) payload.new_password = form.password

        res = await fetch(`/api/admin/users/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const data = await res.json() as { error?: string | Record<string, unknown> }
        const msg = typeof data.error === 'string' ? data.error : 'Lỗi lưu dữ liệu'
        throw new Error(msg)
      }

      setSaveSuccess(true)
      await fetchUsers()
      setTimeout(() => {
        setMode('list')
        setSaveSuccess(false)
      }, 900)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(u: AdminUser) {
    if (u.username === currentUser?.username) return
    if (!confirm(`Vô hiệu hóa tài khoản "${u.display_name}"?\nTài khoản sẽ không đăng nhập được nữa.`)) return

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Thao tác thất bại')
      await fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  async function handleReactivate(u: AdminUser) {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
      if (!res.ok) throw new Error('Thao tác thất bại')
      await fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  const isCreating  = mode === 'create'
  const isEditing   = mode === 'edit'
  const showPanel   = isCreating || isEditing
  const canSave     = isCreating
    ? !!form.username && !!form.display_name && form.password.length >= 6
    : !!form.display_name

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* ── Left: user table ── */}
      <div className={`flex flex-col gap-4 ${showPanel ? 'w-1/2' : 'w-full'} transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A2E]">Quản lý tài khoản nhân viên</h2>
            <p className="text-xs text-[#666666] mt-0.5">{users.length} tài khoản</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchUsers()}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
              title="Tải lại"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-[#005BAA] hover:bg-[#0078D7] text-white text-sm font-medium px-3 py-2 rounded-lg transition"
            >
              <Plus size={15} />
              Thêm tài khoản
            </button>
          </div>
        </div>

        {/* Error */}
        {fetchError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0" />
            {fetchError}
          </div>
        )}

        {/* Table */}
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            <span className="text-sm">Đang tải…</span>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-[#666666]">Tài khoản</th>
                  <th className="text-left px-4 py-3 font-medium text-[#666666]">Vai trò</th>
                  <th className="text-left px-4 py-3 font-medium text-[#666666]">Trạng thái</th>
                  <th className="text-right px-4 py-3 font-medium text-[#666666]">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleConf = ROLE_CONFIG[u.role as AdminRole] ?? ROLE_CONFIG.staff
                  const RoleIcon = roleConf.Icon
                  const isSelf = u.username === currentUser?.username

                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1A1A2E]">{u.display_name}</div>
                        <div className="text-xs text-[#666666]">@{u.username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${roleConf.cls}`}>
                          <RoleIcon size={11} />
                          {roleConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Vô hiệu
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-gray-500 hover:text-[#005BAA] hover:bg-blue-50 rounded-lg transition"
                            title="Chỉnh sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          {u.is_active ? (
                            <button
                              onClick={() => handleDeactivate(u)}
                              disabled={isSelf}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isSelf ? 'Không thể vô hiệu hóa tài khoản đang đăng nhập' : 'Vô hiệu hóa'}
                            >
                              <UserX size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(u)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Kích hoạt lại"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">
                      Chưa có tài khoản nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Right: create / edit panel ── */}
      {showPanel && (
        <div className="w-1/2 bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-5 self-start">
          {/* Panel header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1A1A2E]">
              {isCreating ? 'Thêm tài khoản mới' : 'Chỉnh sửa tài khoản'}
            </h3>
            <button onClick={closePanel} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
              <X size={16} />
            </button>
          </div>

          {/* Username — chỉ hiện khi tạo mới */}
          {isCreating && (
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                Tên đăng nhập <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="vd: nhanvien01"
                value={form.username}
                onChange={(e) => setField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005BAA] focus:border-transparent transition"
              />
              <p className="text-xs text-gray-400 mt-1">Chỉ dùng chữ thường, số và dấu _</p>
            </div>
          )}

          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
              Tên hiển thị <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="vd: Nguyễn Văn A"
              value={form.display_name}
              onChange={(e) => setField('display_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005BAA] focus:border-transparent transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
              Mật khẩu {isCreating && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              placeholder={isEditing ? 'Để trống nếu không đổi' : 'Tối thiểu 6 ký tự'}
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005BAA] focus:border-transparent transition"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">Vai trò</label>
            <select
              value={form.role}
              onChange={(e) => setField('role', e.target.value as AdminRole)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#005BAA] focus:border-transparent transition bg-white"
            >
              <option value="staff">Nhân viên</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Feedback */}
          {saveError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" />
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2.5">
              <CheckCircle2 size={14} className="flex-shrink-0" />
              {isCreating ? 'Tạo tài khoản thành công!' : 'Cập nhật thành công!'}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="flex-1 flex items-center justify-center gap-2 bg-[#005BAA] hover:bg-[#0078D7] text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Đang lưu…' : isCreating ? 'Tạo tài khoản' : 'Lưu thay đổi'}
            </button>
            <button
              onClick={closePanel}
              className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
