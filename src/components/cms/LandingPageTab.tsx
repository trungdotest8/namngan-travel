'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Sparkles, ExternalLink, RefreshCw, Layers } from 'lucide-react';

interface LandingPageSummary {
  id: string;
  slug: string;
  headline: string;
  price_deal: number | null;
  departure_note: string | null;
  tour_id: string | null;
  updated_at: string;
}

interface TourSelectorItem {
  id: string;
  code: string;
  name: string;
}

// ── Helpers ──────────────────────────────────────────────────────
const toSlug = (v: string) =>
  v.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const fmtVND = (n: number) => `${Intl.NumberFormat('vi-VN').format(n)}đ`;

export default function LandingPageTab() {
  const [pages, setPages] = useState<LandingPageSummary[]>([]);
  const [tours, setTours] = useState<TourSelectorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form States
  const [fbText, setFbText] = useState('');
  const [selectedTourId, setSelectedTourId] = useState('');
  const [slug, setSlug] = useState('');

  // ── Fetch song song ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resPages, resTours] = await Promise.all([
        fetch('/api/admin/landing-pages'),
        fetch('/api/tours?limit=200&is_active=true'),
      ]);

      if (resPages.ok) {
        const d = await resPages.json() as { pages: LandingPageSummary[] };
        setPages(d.pages ?? []);
      }

      if (resTours.ok) {
        const d = await resTours.json() as { tours: TourSelectorItem[] };
        setTours(d.tours ?? []);
      }
    } catch (err) {
      console.error('[LandingPageTab] fetchData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Reset Form ────────────────────────────────────────────────────
  const resetForm = () => {
    setFbText('');
    setSelectedTourId('');
    setSlug('');
    setErrorMessage('');
  };

  const handleClose = () => {
    resetForm();
    setIsDialogOpen(false);
  };

  // ── Submit generate ───────────────────────────────────────────────
  const handleGeneratePage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!fbText.trim() || !selectedTourId || !slug.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ tất cả các trường bắt buộc.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/landing-page/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fb_text: fbText.trim(),
          tour_id: selectedTourId,
          slug: toSlug(slug),
        }),
      });

      const result = await res.json() as { error?: string; slug?: string };

      if (!res.ok) throw new Error(result.error ?? 'Quá trình trích xuất bằng AI thất bại.');

      handleClose();
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#005BAA]" />
            Quản Lý Landing Page Chiến Dịch
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tự động bóc tách bài viết Facebook Ads → trang đích chuyển đổi chuẩn cấu trúc SEO.
          </p>
        </div>

        <button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#005BAA] hover:bg-[#0078D7] active:scale-[0.98] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Tạo Trang Bằng AI
        </button>
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#005BAA]" />
          <p className="text-slate-500 text-sm font-medium">Đang tải danh sách Landing Page...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold text-sm border-b border-slate-200">
                  <th className="p-4">Tiêu Đề Chiến Dịch</th>
                  <th className="p-4">URL Slug</th>
                  <th className="p-4">Giá Ưu Đãi</th>
                  <th className="p-4">Khởi Hành</th>
                  <th className="p-4 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {pages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-slate-400 font-medium">
                      Chưa có Landing Page nào được khởi tạo. Bấm &quot;Tạo Trang Bằng AI&quot; để bắt đầu chiến dịch!
                    </td>
                  </tr>
                ) : (
                  pages.map((page) => (
                    <tr key={page.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-slate-900 max-w-xs truncate">
                        {page.headline}
                      </td>
                      <td className="p-4">
                        <span className="bg-blue-50 text-[#005BAA] font-mono px-2 py-1 rounded-md text-xs">
                          /promo/{page.slug}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-[#FF6B00]">
                        {page.price_deal ? fmtVND(page.price_deal) : '—'}
                      </td>
                      <td className="p-4 text-slate-500">
                        {page.departure_note ?? '—'}
                      </td>
                      <td className="p-4 text-center">
                        <a
                          href={`/promo/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#005BAA] hover:text-[#0078D7] font-bold text-xs transition-colors"
                        >
                          Xem Live <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal biểu mẫu trích xuất */}
      {isDialogOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF6B00] fill-[#FF6B00]" />
                Trích Xuất Landing Page Bằng AI
              </h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Đóng"
                className="text-slate-400 hover:text-slate-600 text-xl font-bold transition-colors leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleGeneratePage} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* URL Slug */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    URL Slug chiến dịch <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="tour-cuu-trai-cau-he-2026"
                    value={slug}
                    onChange={(e) => setSlug(toSlug(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#005BAA] focus:outline-none font-mono text-sm"
                  />
                  {slug && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      → namngantravel.com/promo/{slug}
                    </p>
                  )}
                </div>

                {/* Tour Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Tour gốc (lấy kho ảnh SEO) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedTourId}
                    onChange={(e) => setSelectedTourId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-100 focus:border-[#005BAA] focus:outline-none text-sm font-medium"
                  >
                    <option value="">-- Chọn Tour Gốc Để Bốc Ảnh --</option>
                    {tours.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.code}] {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* FB Ads Text Area */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Nội dung Facebook Ads <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Dán toàn bộ text sao chép từ bài viết Facebook Ads vào đây..."
                  value={fbText}
                  onChange={(e) => setFbText(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#005BAA] focus:outline-none text-sm leading-relaxed resize-none"
                />
                <p className="text-[11px] text-slate-400 font-semibold">
                  {fbText.length} ký tự — Sonnet AI sẽ tự động bóc tách headline, giá tiền, và tính năng nổi bật.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#005BAA] hover:bg-[#0078D7] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow flex items-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Đang bóc tách AI...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 fill-white" /> Khởi Tạo Ngay</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
