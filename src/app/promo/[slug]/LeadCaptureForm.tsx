'use client';

import { useState } from 'react';
import { z } from 'zod';

const FormSchema = z.object({
  name:  z.string().min(2, 'Vui lòng nhập tên ít nhất 2 ký tự'),
  phone: z.string().regex(/^(0|\+84)[0-9]{8,9}$/, 'Số điện thoại không hợp lệ'),
  note:  z.string().optional(),
});

type FormState = 'idle' | 'loading' | 'success' | 'error';

interface Props {
  tourId?: string;
  slug: string;
}

export default function LeadCaptureForm({ tourId, slug }: Props) {
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote]   = useState('');
  const [hp, setHp]       = useState(''); // honeypot — ẩn với người dùng thật
  const [errors, setErrors] = useState<Partial<Record<'name' | 'phone', string>>>({});
  const [state, setState] = useState<FormState>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Zod validate client-side
    const result = FormSchema.safeParse({ name, phone, note });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const err of result.error.errors) {
        const field = err.path[0] as 'name' | 'phone';
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setState('loading');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                 result.data.name,
          phone:                result.data.phone,
          note:                 result.data.note ?? '',
          website_hp:           hp, // honeypot — bot sẽ điền vào, người thật không thấy
          lead_source:          'web_ads',
          source_channel:       'landing_page',
          tour_id:              tourId,
          destination_interest: slug,
        }),
      });

      if (!res.ok) throw new Error('API error');
      setState('success');
    } catch {
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="max-w-lg mx-auto text-center py-10 px-4">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h3 className="text-white text-xl font-bold mb-2">Đã nhận yêu cầu của bạn!</h3>
        <p className="text-blue-100 text-sm">
          Tư vấn viên sẽ liên hệ trong vòng <strong className="text-white">30 phút</strong>.
          Vui lòng giữ máy.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <h2 className="text-white text-xl font-bold text-center mb-6">
        Nhận báo giá & tư vấn miễn phí
      </h2>

      {/* Honeypot — ẩn hoàn toàn với CSS, bot tự động điền */}
      <input
        type="text"
        name="website_hp"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        autoComplete="off"
      />

      {/* Tên */}
      <div>
        <input
          type="text"
          required
          placeholder="Họ và tên *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
        />
        {errors.name && <p className="text-yellow-200 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Số điện thoại */}
      <div>
        <input
          type="tel"
          required
          placeholder="Số điện thoại (Zalo) *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
        />
        {errors.phone && <p className="text-yellow-200 text-xs mt-1">{errors.phone}</p>}
      </div>

      {/* Ghi chú */}
      <textarea
        rows={3}
        placeholder="Ghi chú (không bắt buộc): số người, ngày muốn đi..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
      />

      {state === 'error' && (
        <p className="text-yellow-200 text-sm text-center">
          Có lỗi xảy ra. Vui lòng thử lại hoặc gọi hotline{' '}
          <a href="tel:0932611933" className="underline font-bold">0932 611 933</a>.
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        style={{ backgroundColor: '#FF6B00' }}
        className="w-full py-4 rounded-xl text-white font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
      >
        {state === 'loading' ? 'Đang gửi...' : '🎯 Nhận báo giá miễn phí ngay'}
      </button>
    </form>
  );
}
