import bcrypt from 'bcryptjs'
import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { UpdateAdminUserSchema } from '@/lib/validations/admin-user.schema'

const BCRYPT_ROUNDS = 12

// PATCH /api/admin/users/[id] — update display_name, role, is_active, password
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateAdminUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { new_password, ...rest } = parsed.data
    const updates: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    }

    if (new_password) {
      updates.password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS)
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admin_users')
      .update(updates)
      .eq('id', id)
      .select('id, username, display_name, role, is_active, created_at, updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] — soft deactivate (is_active = false)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admin_users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, username, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
