'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore, notificationLabel } from '@/store'
import type { NotificationEvent } from '@/types'

// Payload broadcast từ Supabase channel 'admin-notifications'
interface NotificationBroadcast {
  event: NotificationEvent
  title: string
  body: string
  meta?: Record<string, unknown>
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s trước`
  if (diff < 3600) return `${Math.floor(diff / 60)}m trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`
  return `${Math.floor(diff / 86400)}d trước`
}

const EVENT_ICON: Record<NotificationEvent, string> = {
  new_lead:          '👤',
  new_booking:       '🎫',
  booking_confirmed: '✅',
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { notifications, unreadCount, addNotification, markAsRead, markAllAsRead, dismiss } =
    useNotificationStore()

  // Subscribe Supabase Realtime channel 'admin-notifications'
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin-notifications')
      .on('broadcast', { event: '*' }, (msg) => {
        const payload = msg.payload as NotificationBroadcast
        if (!payload?.event) return
        addNotification({
          event:      payload.event,
          title:      payload.title ?? notificationLabel(payload.event),
          body:       payload.body ?? '',
          meta:       payload.meta,
          created_at: payload.created_at ?? new Date().toISOString(),
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [addNotification])

  // Đóng panel khi click ngoài
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 focus:outline-none"
        aria-label="Thông báo"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B00] text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold text-gray-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#005BAA] hover:underline"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <li className="py-10 text-center text-sm text-gray-400">
                Chưa có thông báo nào
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                    !n.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <span className="mt-0.5 text-xl">{EVENT_ICON[n.event] ?? '🔔'}</span>
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => markAsRead(n.id)}
                  >
                    <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.created_at)}</p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="mt-0.5 rounded p-0.5 text-gray-300 hover:text-gray-500"
                    aria-label="Xóa thông báo"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))
            )}
          </ul>

          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2 text-center">
              <button
                onClick={() => useNotificationStore.getState().clearAll()}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Xóa tất cả
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
