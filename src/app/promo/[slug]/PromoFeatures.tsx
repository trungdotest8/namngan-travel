import {
  Plane, Star, Shield, Clock, MapPin, Gift,
  Camera, Heart, Award, Zap, type LucideIcon,
} from 'lucide-react';
import type { PromoFeature } from '@/types/landing-page';

const ICON_MAP: Record<string, LucideIcon> = {
  Plane, Star, Shield, Clock, MapPin, Gift,
  Camera, Heart, Award, Zap,
};

interface Props {
  features: PromoFeature[];
}

export default function PromoFeatures({ features }: Props) {
  if (features.length === 0) return null;

  return (
    <section style={{ backgroundColor: '#F0F7FF' }} className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-[#1A1A2E] mb-8 text-center">Điểm nổi bật chuyến đi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = ICON_MAP[f.icon] ?? Star;
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-blue-50 flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#005BAA' }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#1A1A2E] text-sm">{f.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
