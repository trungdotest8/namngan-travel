'use client'

import { create } from 'zustand'
import type { RealtimeNotification, NotificationEvent } from '@/types'

interface NotificationState {
  notifications: RealtimeNotification[]
  unreadCount: number

  // Thêm notification mới (từ Supabase Realtime channel)
  addNotification: (payload: Omit<RealtimeNotification, 'id' | 'read'>) => void

  // Đánh dấu đã đọc
  markAsRead: (id: string) => void
  markAllAsRead: () => void

  // Xóa khỏi danh sách
  dismiss: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (payload) =>
    set((state) => {
      const notification: RealtimeNotification = {
        ...payload,
        id: crypto.randomUUID(),
        read: false,
      }
      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      }
    }),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  dismiss: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id)
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: target && !target.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}))

// Helper: chuyển NotificationEvent sang tiêu đề tiếng Việt
export function notificationLabel(event: NotificationEvent): string {
  const map: Record<NotificationEvent, string> = {
    new_lead:          'Khách hàng mới',
    new_booking:       'Đặt tour mới',
    booking_confirmed: 'Xác nhận đặt tour',
  }
  return map[event] ?? event
}
