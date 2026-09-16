'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { menuApi } from '@/lib/api';
import ItemDetailsSheet from '@/components/ItemDetailsSheet';

const STORIES = [
  { id: 1, label: 'عروض اليوم' },
  { id: 2, label: 'الأعلى مبيعاً' },
  { id: 3, label: 'جديدنا' },
  { id: 4, label: 'وجبات العائلة' },
  { id: 5, label: 'مشروبات' },
];

function DealSkeleton() {
  return (
    <div className="w-[150px] shrink-0 animate-pulse rounded-2xl bg-white/[0.06] p-3 md:w-full md:p-4">
      <div className="h-20 w-full rounded-xl bg-white/[0.1] md:h-32" />
      <div className="mt-2.5 h-3 w-3/4 rounded bg-white/[0.1]" />
      <div className="mt-2 h-3 w-1/2 rounded bg-white/[0.1]" />
    </div>
  );
}

export default function HeroSection() {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadDeals() {
      try {
        setIsLoading(true);
        setLoadError(false);
        const res = await menuApi.getFeatured();
        if (!ignore) setDeals(res.data.items ?? []);
      } catch (err) {
        if (!ignore) {
          setDeals([]);
          setLoadError(true);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadDeals();
    return () => {
      ignore = true;
    };
  }, []);

  function openSheet(item) {
    setSelectedItem(item);
    setIsSheetOpen(true);
  }

  function closeSheet() {
    setIsSheetOpen(false);
  }

  const showSection = isLoading || deals.length > 0;

  return (
    <section className="pt-4">
      {/* شريط القصص — تنقل إلى صفحة المنيو، جاهزة لاحقاً للتصفية حسب الفئة */}
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STORIES.map((story) => (
          <Link
            key={story.id}
            href="/menu"
            className="flex shrink-0 snap-start flex-col items-center gap-1.5"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-black via-black to-[#FFC629] p-[2.5px] md:h-20 md:w-20">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
                <span className="h-[85%] w-[85%] rounded-full bg-[#FFF6DE]" />
              </span>
            </span>
            <span className="max-w-[64px] text-center text-[11px] font-medium leading-tight text-black/70 md:max-w-[80px] md:text-[12px]">
              {story.label}
            </span>
          </Link>
        ))}
      </div>

      {showSection && (
        <div className="mt-5 rounded-[28px] bg-[#151310] px-5 pb-6 pt-5 text-white md:px-8 md:pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-[#FFC629]" fill="#FFC629" />
              <h2 className="text-[17px] font-bold md:text-[20px]">عروض سريعة</h2>
            </div>
            <span className="text-[11px] text-white/50 md:text-[13px]">تنتهي الليلة</span>
          </div>

          {loadError && !isLoading && (
            <p className="mt-4 text-[12px] text-white/50">تعذّر تحميل العروض حالياً</p>
          )}

          <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <DealSkeleton key={i} />)
              : deals.map((deal) => (
                  <button
                    key={deal._id}
                    onClick={() => openSheet(deal)}
                    className="w-[150px] shrink-0 rounded-2xl bg-white/[0.06] p-3 text-left transition-colors active:bg-white/[0.1] md:w-full md:shrink-0 md:p-4"
                  >
                    <div className="relative h-20 w-full overflow-hidden rounded-xl bg-white/[0.08] md:h-32">
                      {deal.images?.[0] && (
                        <Image
                          src={deal.images[0]}
                          alt={deal.name?.ar}
                          fill
                          sizes="(min-width: 1024px) 22vw, (min-width: 768px) 28vw, 150px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <p className="mt-2.5 text-[13px] font-semibold leading-tight md:text-[15px]">
                      {deal.name?.ar}
                    </p>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-[15px] font-bold text-[#FFC629] md:text-[17px]">
                        {deal.basePrice} ج.م
                      </span>
                      {deal.oldPrice && (
                        <span className="text-[11px] text-white/40 line-through">{deal.oldPrice}</span>
                      )}
                    </div>
                  </button>
                ))}
          </div>

          {/*
            "اطلب الآن" opens the sheet for the first/top deal, since this is a
            single page-level CTA rather than a per-card button. If you want a
            per-card "Order now" instead, that's a small change to the card
            button above rather than this one.
          */}
          <button
            onClick={() => deals[0] && openSheet(deals[0])}
            disabled={deals.length === 0}
            className="mt-5 w-full rounded-full bg-[#FFC629] py-3 text-[14px] font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-40 md:mt-6 md:w-auto md:px-10"
          >
            اطلب الآن
          </button>
        </div>
      )}

      <ItemDetailsSheet item={isSheetOpen ? selectedItem : null} onClose={closeSheet} />
    </section>
  );
}