'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plane, LayoutDashboard, Users, Settings, Newspaper, MapPin,
  Bell, Plus, TrendingUp, TrendingDown, Menu, X,
  CheckCircle2, AlertCircle, Loader2, LogOut, UserCog,
} from 'lucide-react'
import { useCustomerProfileStore } from '@/store/customer-profile.store'
import { CustomerTable } from '@/components/customer-profile/CustomerTable'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { CustomerProfileDrawer } from '@/components/customer-profile/CustomerProfileDrawer'
import { ArticlesTab } from './ArticlesTab'
import { ToursTab } from './ToursTab'
import { StaffTab } from './StaffTab'
import { DestinationsTab } from './DestinationsTab'
import type { Lead } from '@/types/lead.types'
import type { AdminUser } from '@/types/admin.types'

// ── Types ─────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'customers' | 'articles' | 'tours' | 'destinations' | 'staff' | 'config'

// ── Helpers ───────────────────────────────────────────────────────────────
function computeMetrics(leads: Lead[]) {
  const total = leads.length
  const booked = leads.filter((l) => l.status === 'deposited' || l.status === 'converted').length
  const cvr = total > 0 ? Math.round((booked / total) * 100) : 0
  return { total, cvr, booked }
}

// ── SVG Line Chart ────────────────────────────────────────────────────────
function SimpleLineChart({
  datasets,
}: {
  datasets: { label: string; data: number[]; color: string }[]
}) {
  const W = 400; const H = 110
  const allVals = datasets.flatMap((d) => d.data)
  const max = Math.max(...allVals, 1)

  function pts(data: number[]) {
    return data.map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = H - (v / max) * H * 0.82 - 6
      return [x, y] as [number, number]
    })
  }
  function linePath(points: [number, number][]) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  }
  function areaPath(points: [number, number][]) {
    return `${linePath(points)} L ${W} ${H} L 0 ${H} Z`
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 110 }} preserveAspectRatio="none">
        {datasets.map((ds, i) => {
          const p = pts(ds.data)
          return (
            <g key={i}>
              <path d={areaPath(p)} fill={ds.color} opacity="0.07" />
              <path d={linePath(p)} fill="none" stroke={ds.color} strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
              {p.map((pt, j) => (
                <circle key={j} cx={pt[0]} cy={pt[1]} r="2.5" fill={ds.color} />
              ))}
            </g>
          )
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {['1/5','8/5','15/5','22/5','30/5'].map((l) => (
          <span key={l} className="text-[10px] text-gray-400">{l}</span>
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        {datasets.map((ds) => (
          <div key={ds.label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ds.color }} />
            {ds.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Metric Card ───────────────────────────────────────────────────────────
function MetricCard({
  label, value, sub, up,
}: { label: string; value: string; sub: string; up: boolean }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3.5">
      <div className="text-[11px] text-gray-500 font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold text-[#1A1A2E] leading-none">{value}</div>
      <div className={`flex items-center gap-1 mt-1.5 text-[10.5px] font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {sub}
      </div>
    </div>
  )
}

// ── Source bar ────────────────────────────────────────────────────────────
function SourceBar({ label, count, total, color, badgeCls }: {
  label: string; count: number; total: number; color: string; badgeCls: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${badgeCls}`}>
          {label}
        </span>
        <span className="text-xs font-semibold text-gray-700">{count} lead</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Pipeline status ───────────────────────────────────────────────────────
function PipelineRow({ label, count, cls }: { label: string; count: number; cls: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-medium ${cls}`}>
        {label}
      </span>
      <span className="text-sm font-semibold text-[#1A1A2E]">{count} KH</span>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────
function OverviewTab({ leads }: { leads: Lead[] }) {
  const m = computeMetrics(leads)
  const fbCount  = leads.filter((l) => l.lead_source === 'fb_ads').length
  const webCount = leads.filter((l) => l.lead_source === 'web_ads' || l.lead_source === 'organic').length
  const otherCount = leads.length - fbCount - webCount

  const pipeline = {
    new:       leads.filter((l) => l.status === 'new').length,
    consulting: leads.filter((l) => l.status === 'consulting' || l.status === 'contacted').length,
    deposited: leads.filter((l) => l.status === 'deposited').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    lost:      leads.filter((l) => l.status === 'lost').length,
  }

  const chartData = {
    fb:  [8, 9, 11, 18, 14, 22, 19, 25, 20, 28, 22, 30],
    web: [3, 4,  5,  8,  6, 10,  8, 12,  9, 14, 10, 16],
  }

  return (
    <div className="space-y-3">
      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MetricCard label="Tổng Lead tháng này" value={String(m.total || 248)} sub="+18% so tháng trước" up />
        <MetricCard label="Tỷ lệ chuyển đổi"   value={`${m.cvr || 34}%`}      sub="+5.2% cải thiện"    up />
        <MetricCard label="Doanh thu ước tính"  value="₫892M"                  sub="+22% vs tháng 4"    up />
        <MetricCard label="Chi phí / Lead (CPL)"value="₫48K"                   sub="Giảm 8% — tốt"      up={false} />
      </div>

      {/* Chart + source + notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-3">
            Biểu đồ Lead theo ngày (T5/2026)
          </div>
          <SimpleLineChart datasets={[
            { label: 'Facebook Ads', data: chartData.fb,  color: '#1a56db' },
            { label: 'Web/UTM',      data: chartData.web, color: '#FF6B00' },
          ]} />
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-4">
          {/* Phân bổ nguồn */}
          <div>
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-3">
              Phân bổ nguồn Lead
            </div>
            <div className="flex flex-col gap-3">
              <SourceBar label="Facebook Ads" count={fbCount || 148}   total={leads.length || 248} color="#1a56db" badgeCls="bg-blue-50 text-blue-700" />
              <SourceBar label="Web / UTM"    count={webCount || 72}   total={leads.length || 248} color="#FF6B00" badgeCls="bg-orange-50 text-orange-700" />
              <SourceBar label="Zalo / Khác"  count={otherCount || 28} total={leads.length || 248} color="#0369a1" badgeCls="bg-sky-50 text-sky-700" />
            </div>
          </div>

          {/* Real-time notifications */}
          <div>
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">
              Thông báo Real-time
            </div>
            <div className="space-y-2">
              {[
                { dot: '#22c55e', text: 'Trần Thị Bích vừa đặt tour Đà Nẵng 5N4Đ', time: '2p trước' },
                { dot: '#FF6B00', text: '3 lead mới từ Facebook chiến dịch Hè 2026', time: '15p trước' },
                { dot: '#005BAA', text: 'Nguyễn Văn Hùng yêu cầu đổi lịch Phú Quốc', time: '1h trước' },
                { dot: '#b91c1c', text: 'Cảnh báo: Webhook FB gặp lỗi timeout', time: '2h trước' },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: n.dot }} />
                  <div className="flex-1 text-xs text-[#1A1A2E] leading-relaxed">{n.text}</div>
                  <div className="text-[10px] text-gray-400 whitespace-nowrap">{n.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign + Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-3">
            Hiệu suất chiến dịch đang chạy
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {['Chiến dịch', 'Nguồn', 'Lead', 'CVR'].map((h) => (
                  <th key={h} className="text-left py-2 pr-2 text-[10px] font-semibold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Hè 2026 – Đà Nẵng',    src: 'FB',  lead: 82, cvr: 41, good: true },
                { name: 'Phú Quốc Siêu rẻ',      src: 'FB',  lead: 66, cvr: 36, good: true },
                { name: 'Landing Page Tết 2026',  src: 'Web', lead: 44, cvr: 28, good: false },
                { name: 'Google Ads Korea Tour',  src: 'Web', lead: 28, cvr: 25, good: false },
              ].map((c, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-2 text-[#1A1A2E]">{c.name}</td>
                  <td className="py-2 pr-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      c.src === 'FB' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                    }`}>{c.src}</span>
                  </td>
                  <td className="py-2 pr-2 text-gray-600">{c.lead}</td>
                  <td className="py-2">
                    <span className={`font-semibold ${c.good ? 'text-green-600' : 'text-amber-600'}`}>
                      {c.cvr}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-3">
            Trạng thái Pipeline
          </div>
          <div className="divide-y divide-gray-50">
            <PipelineRow label="Mới nhập"      count={pipeline.new || 68}       cls="bg-[#F0F7FF] text-[#005BAA]" />
            <PipelineRow label="Đang tư vấn"   count={pipeline.consulting || 54} cls="bg-amber-50 text-amber-700" />
            <PipelineRow label="Đã đặt cọc"    count={pipeline.deposited || 81}  cls="bg-green-50 text-green-700" />
            <PipelineRow label="Hoàn thành tour" count={pipeline.converted || 45} cls="bg-purple-50 text-purple-700" />
            <PipelineRow label="Hủy / Không phù hợp" count={pipeline.lost || 22} cls="bg-red-50 text-red-700" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Config Tab ────────────────────────────────────────────────────────────
function ConfigTab() {
  const [configTab, setConfigTab] = useState<'webhook' | 'email'>('webhook')
  return (
    <div>
      <div className="flex border-b border-gray-100 mb-5">
        {(['webhook', 'email'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setConfigTab(t)}
            className={`px-4 py-2 text-[12.5px] font-medium border-b-2 -mb-px transition-colors ${
              configTab === t ? 'border-[#005BAA] text-[#005BAA]' : 'border-transparent text-gray-500'
            }`}
          >
            {t === 'webhook' ? 'Webhook nguồn Lead' : 'Mẫu Email tự động'}
          </button>
        ))}
      </div>

      {configTab === 'webhook' ? (
        <div className="space-y-4">
          {/* Facebook Webhook */}
          <div className="border border-gray-100 rounded-xl p-4 bg-white">
            <div className="text-[13px] font-semibold text-[#1A1A2E] mb-3">
              Facebook Lead Ads — Webhook
            </div>
            <div className="space-y-3">
              <ConfigField label="Webhook Endpoint URL" value="POST /api/webhooks/fb-leads" mono />
              <ConfigField label="Page ID đang kết nối" value="648201983712040" />
              <ConfigField label="Verify Token" value="nnt_fb_xk9m2p3q8r" mono />
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#005BAA] text-white text-xs font-medium hover:bg-[#0078D7] transition-colors">
                <CheckCircle2 size={12} /> Lưu cấu hình
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Test kết nối
              </button>
            </div>
          </div>

          {/* Web / UTM */}
          <div className="border border-gray-100 rounded-xl p-4 bg-white">
            <div className="text-[13px] font-semibold text-[#1A1A2E] mb-3">
              Web Form &amp; UTM Tracking
            </div>
            <div className="space-y-3">
              <ConfigField label="Webhook nhận Form Website" value="POST /api/webhooks/n8n?src=utm" mono />
              <ConfigField label="Tham số UTM theo dõi" value="utm_source, utm_medium, utm_campaign, utm_content, utm_term" />
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#005BAA] text-white text-xs font-medium hover:bg-[#0078D7] transition-colors">
                <CheckCircle2 size={12} /> Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {[
            {
              title: 'Xác nhận đặt cọc thành công',
              subject: '[Nam Ngân Travel] Xác nhận đặt cọc tour {{tour_name}} — {{booking_code}}',
              body: `Kính gửi {{customer_name}},\n\nChúng tôi xác nhận đã nhận được khoản đặt cọc {{deposit_amount}} cho tour {{tour_name}} ({{tour_dates}}).\n\nMã đặt chỗ: {{booking_code}}\nSố khách: {{num_pax}} người\n\nTrân trọng,\nNam Ngân Travel Team`,
            },
            {
              title: 'Thay đổi lịch trình',
              subject: '[Quan trọng] Thay đổi lịch tour {{tour_name}} — {{booking_code}}',
              body: `Kính gửi {{customer_name}},\n\nChúng tôi thông báo có sự thay đổi về lịch trình:\n- Lịch cũ: {{old_date}}\n- Lịch mới: {{new_date}}\n- Lý do: {{reason}}\n\nXin lỗi vì sự bất tiện này.\nNam Ngân Travel Team`,
            },
          ].map((t, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-4 bg-white">
              <div className="text-[13px] font-semibold text-[#1A1A2E] mb-3">{t.title}</div>
              <div className="space-y-2.5">
                <div>
                  <div className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tiêu đề email</div>
                  <input defaultValue={t.subject} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 focus:border-[#005BAA] outline-none" />
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Nội dung (hỗ trợ biến {'{{...}}'})</div>
                  <textarea defaultValue={t.body} rows={5} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 focus:border-[#005BAA] outline-none resize-none leading-relaxed" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#005BAA] text-white text-xs font-medium hover:bg-[#0078D7] transition-colors">
                  <CheckCircle2 size={12} /> Lưu mẫu
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Gửi thử
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfigField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      {mono
        ? <div className="font-mono text-[11.5px] bg-gray-50 border border-gray-100 rounded px-2.5 py-1.5 text-gray-500 break-all">{value}</div>
        : <input defaultValue={value} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 focus:border-[#005BAA] outline-none" />
      }
    </div>
  )
}

// ── Main CRM Page ─────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview'  as TabId, label: 'Chiến dịch & Thông báo', icon: LayoutDashboard },
  { id: 'customers' as TabId, label: 'Danh sách Khách hàng',   icon: Users },
  { id: 'articles'  as TabId, label: 'Bài viết / Tin tức',     icon: Newspaper },
  { id: 'tours'        as TabId, label: 'Quản lý Tour',         icon: MapPin },
  { id: 'destinations' as TabId, label: 'Điểm đến nổi bật',    icon: Plane },
  { id: 'staff'        as TabId, label: 'Nhân Viên',            icon: UserCog },
  { id: 'config'    as TabId, label: 'Webhook & Email',         icon: Settings },
]

const TAB_TITLES: Record<TabId, string> = {
  overview:  'Tổng quan Chiến dịch',
  customers: 'Danh sách Khách hàng',
  articles:  'Quản lý Bài viết',
  tours:        'Quản lý Tour — Hình ảnh & Hashtags',
  destinations: 'Điểm đến nổi bật — Trang chủ',
  staff:        'Quản lý Nhân Viên',
  config:    'Cấu hình Webhook & Email',
}

function CRMPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null)
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null)
  const setCustomers = useCustomerProfileStore((s) => s.setCustomers)
  const setLoading   = useCustomerProfileStore((s) => s.setLoading)
  const leads        = useCustomerProfileStore((s) => s.customers)
  const isLoading    = useCustomerProfileStore((s) => s.isLoading)
  const openDrawer   = useCustomerProfileStore((s) => s.openDrawer)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/customer-profile?limit=100')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { leads: data } = await res.json()
      setCustomers(data ?? [])
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [setCustomers, setLoading])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d: { user?: AdminUser }) => { if (d.user) setCurrentAdmin(d.user) })
      .catch(() => null)
  }, [])

  async function handleSyncSeastar() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/departures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      })
      const json = await res.json()
      setSyncResult(json.result ?? { synced: 0, errors: ['Không có kết quả trả về'] })
    } catch {
      setSyncResult({ synced: 0, errors: ['Không thể kết nối server'] })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`w-[220px] bg-[#005BAA] flex flex-col flex-shrink-0 fixed md:static inset-y-0 left-0 z-50 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#FF6B00] rounded-md flex items-center justify-center flex-shrink-0">
              <Plane size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-[14px] leading-tight">Nam Ngân Travel</div>
              <div className="text-white/40 text-[10px] tracking-widest uppercase">CRM Platform</div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 text-white/50 hover:text-white/80 rounded-md transition-colors flex-shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="px-4 py-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
            Tổng quan
          </div>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium border-l-3 transition-all ${
                activeTab === id
                  ? 'bg-white/14 text-white border-l-[3px] border-l-[#FF6B00]'
                  : 'text-white/65 border-l-[3px] border-l-transparent hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon size={15} />
              <span className="leading-tight text-left">{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
              {(currentAdmin?.display_name ?? 'A').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-white/80 text-[12px] font-medium">
                {currentAdmin?.display_name ?? 'Admin'}
              </div>
              <div className="text-white/40 text-[10px]">
                {currentAdmin?.role === 'admin' ? 'Super Admin' : 'Nhân viên'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 h-[52px] px-3 md:px-5 flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <Menu size={16} />
          </button>

          <div className="flex-1 font-bold text-[14px] md:text-[15px] text-[#1A1A2E] min-w-0 truncate">
            {TAB_TITLES[activeTab]}
            <span className="hidden md:inline text-gray-400 text-xs font-normal ml-2">
              · Cập nhật {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Live indicator — hidden on mobile */}
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-green-600 mr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>

          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors flex-shrink-0">
            <Bell size={15} className="text-gray-500" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#FF6B00] rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-white">
              4
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('customers'); openDrawer('') }}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#005BAA] text-white text-xs font-medium hover:bg-[#0078D7] transition-colors flex-shrink-0"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Thêm KH</span>
          </button>

          <button
            onClick={async () => {
              await fetch('/api/admin/auth', { method: 'DELETE' })
              window.location.href = '/login'
            }}
            title="Đăng xuất"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 hover:bg-red-50 hover:border-red-200 text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <LogOut size={14} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-5">
          {/* Error banner */}
          {fetchError && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={15} />
              <span>Không thể tải dữ liệu: {fetchError}</span>
              <button onClick={fetchLeads} className="ml-auto text-xs underline hover:no-underline">
                Thử lại
              </button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Đang tải dữ liệu...</span>
            </div>
          )}

          {!isLoading && (
            <>
              {activeTab === 'overview'  && <OverviewTab leads={leads} />}
              {activeTab === 'customers' && (
                <div>
                  <div className="mb-4">
                    <div className="font-bold text-xl text-[#1A1A2E]">Danh sách Khách hàng</div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      Quản lý toàn bộ hồ sơ khách hàng — bấm vào tên để xem chi tiết &amp; tài liệu đính kèm
                    </div>
                  </div>
                  <CustomerTable />
                </div>
              )}
              {activeTab === 'articles' && (
                <ErrorBoundary moduleName="ArticlesTab">
                  <ArticlesTab />
                </ErrorBoundary>
              )}
              {activeTab === 'tours' && (
                <ErrorBoundary moduleName="ToursTab">
                  <ToursTab />
                </ErrorBoundary>
              )}
              {activeTab === 'destinations' && (
                <ErrorBoundary moduleName="DestinationsTab">
                  <DestinationsTab />
                </ErrorBoundary>
              )}
              {activeTab === 'staff' && (
                <ErrorBoundary moduleName="StaffTab">
                  <StaffTab />
                </ErrorBoundary>
              )}
              {activeTab === 'config' && (
                <div>
                  <div className="mb-4">
                    <div className="font-bold text-xl text-[#1A1A2E]">Cấu hình Webhook &amp; Email</div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      Thiết lập nguồn nhận lead tự động và mẫu email xác nhận đặt chỗ
                    </div>
                  </div>
                  <ConfigTab />

                  {/* ── Đồng bộ dữ liệu ── */}
                  <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
                    <div className="font-semibold text-[#1A1A2E] mb-1">Đồng bộ lịch SeaStar</div>
                    <div className="text-sm text-gray-400 mb-4">
                      Cào dữ liệu lịch trình mới nhất từ lich.seastartravel.vn và lưu vào database.
                    </div>
                    <button
                      onClick={handleSyncSeastar}
                      disabled={syncing}
                      className="flex items-center gap-2 px-4 py-2 bg-[#005BAA] text-white text-sm font-medium rounded-lg hover:bg-[#0078D7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {syncing && <Loader2 size={14} className="animate-spin" />}
                      {syncing ? 'Đang đồng bộ...' : 'Đồng bộ lịch SeaStar'}
                    </button>
                    {syncResult && (
                      <div className="mt-3 flex items-start gap-2 text-sm">
                        {syncResult.errors.length === 0 ? (
                          <CheckCircle2 size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="text-gray-700">
                          Đã sync <strong>{syncResult.synced}</strong> lịch trình
                          {syncResult.errors.length > 0 && (
                            <span className="text-amber-600"> · {syncResult.errors.length} lỗi: {syncResult.errors[0]}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Drawer: bọc ở ngoài cùng, Principle #4 */}
      <ErrorBoundary moduleName="CustomerProfileDrawer">
        <CustomerProfileDrawer />
      </ErrorBoundary>
    </div>
  )
}

// Wrap toàn bộ CRM để một lỗi bất kỳ không crash app (Nguyên tắc #4)
const CRMPageWrapped = () => (
  <ErrorBoundary moduleName="CRM Admin">
    <CRMPage />
  </ErrorBoundary>
)

export default CRMPageWrapped
