'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import ItemDetailsSheet from '@/components/ItemDetailsSheet';
import { menuApi } from '@/lib/api';

// The `category` field on a live MenuItem is a Mongo ObjectId reference,
// and the menu API populates it (`.populate('category')`), so at runtime
// `item.category` is an object like { _id, name: { ar, en }, slug, ... } —
// not a plain string. These helpers handle both shapes safely.
function getCategoryId(category) {
  if (!category) return null;
  if (typeof category === 'string') return category;
  return category._id || category.slug || null;
}

function getCategoryLabel(category) {
  if (!category) return '';
  if (typeof category === 'string') return category;
  return category.name?.ar || category.name?.en || category.slug || '';
}

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadMenu() {
      try {
        setIsLoading(true);
        setLoadError(false);
        const res = await menuApi.getAll();
        if (!ignore) setItems(res.data.items ?? []);
      } catch (err) {
        if (!ignore) setLoadError(true);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadMenu();
    return () => {
      ignore = true;
    };
  }, []);

  // Dynamic category tabs — extracted from whatever categories actually
  // exist on the fetched items, never hardcoded. Deduped by id since
  // `category` is a possibly-populated object, not a string.
  const categories = useMemo(() => {
    const seen = new Map();
    items.forEach((item) => {
      const id = getCategoryId(item.category);
      if (id && !seen.has(id)) seen.set(id, getCategoryLabel(item.category));
    });
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [items]);

  const visibleItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((i) => getCategoryId(i.category) === activeCategory);
  }, [items, activeCategory]);

  // "Quick Offers" — reuses the already-fetched `items`, filtered to
  // whatever's flagged isFeaturedOnHome.
  const offerItems = useMemo(() => items.filter((i) => i.isFeaturedOnHome), [items]);

  function openSheet(item) {
    setSelectedItem(item);
    setIsSheetOpen(true);
  }

  function closeSheet() {
    setIsSheetOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] pb-24">
      {/* ⚠ LAYOUT CLEANUP: the Stories row (circular icons) and the old
          light-themed offers section both lived inside <HeroSection />,
          which isn't part of what was shared for this change. Since both
          were asked to be removed and nothing else about HeroSection was
          referenced, the import/usage has been dropped entirely here. If
          HeroSection rendered anything else you want to keep, say so and
          share that file — right now nothing calls it anymore. */}

      {offerItems.length > 0 && (
        <QuickOffers items={offerItems} onSelect={openSheet} />
      )}

      <section className="mt-6 px-4 md:px-0">
        {/* Sticky category tabs — stays pinned to the top while the menu
            grid scrolls beneath it. */}
        {categories.length > 0 && (
          <div className="sticky top-0 z-20 -mx-4 bg-white/90 px-4 py-2 backdrop-blur md:mx-0 md:px-0">
            <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setActiveCategory('all')}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                  activeCategory === 'all' ? 'bg-black text-white' : 'bg-white text-black/60 ring-1 ring-black/10'
                }`}
              >
                الكل
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                    activeCategory === cat.id ? 'bg-black text-white' : 'bg-white text-black/60 ring-1 ring-black/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white p-3 ring-1 ring-black/5">
                <div className="aspect-square w-full rounded-xl bg-black/5" />
                <div className="mt-2 h-3 w-3/4 rounded bg-black/5" />
                <div className="mt-2 h-3 w-1/2 rounded bg-black/5" />
              </div>
            ))}
          </div>
        )}

        {loadError && !isLoading && (
          <p className="mt-4 text-center text-[13px] text-black/40">تعذّر تحميل المنيو حالياً</p>
        )}

        {!isLoading && !loadError && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item) => (
              <button
                key={item._id}
                onClick={() => openSheet(item)}
                className="rounded-2xl bg-white p-3 text-left ring-1 ring-black/5 transition-transform active:scale-[0.98]"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/5">
                  {item.images?.[0] && (
                    <Image
                      src={item.images[0]}
                      alt={item.name?.ar}
                      fill
                      sizes="(min-width: 1024px) 22vw, (min-width: 768px) 28vw, 45vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 text-[13px] font-semibold leading-tight text-black">{item.name?.ar}</p>
                <p className="mt-1 text-[13px] font-bold text-[#b8891f]">{item.basePrice} ج.م</p>
              </button>
            ))}
            {visibleItems.length === 0 && (
              <p className="col-span-full py-6 text-center text-[13px] text-black/40">
                لا توجد أصناف في هذا القسم
              </p>
            )}
          </div>
        )}
      </section>

      <ItemDetailsSheet item={isSheetOpen ? selectedItem : null} onClose={closeSheet} />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Quick Offers — dark, "Bazooka"-style auto-scrolling carousel.
// Full-bleed dark section, 2 cards visible on mobile / 3 on tablet / 4 on
// desktop, entire card clickable, no separate CTA button.
// ---------------------------------------------------------------------------
function QuickOffers({ items, onSelect }) {
  const scrollRef = useRef(null);
  const directionRef = useRef(1); // 1 = forward, -1 = backward

  // Auto-advances one card every 3s, then reverses direction once it hits
  // either end instead of jump-cutting back to the start.
  useEffect(() => {
    if (items.length <= 1) return undefined;

    const timer = setInterval(() => {
      const container = scrollRef.current;
      if (!container) return;

      const card = container.firstElementChild;
      const cardWidth = card ? card.getBoundingClientRect().width : container.clientWidth * 0.45;
      const gapPx = 12; // matches gap-3 below
      const step = cardWidth + gapPx;
      const maxScroll = container.scrollWidth - container.clientWidth;

      let next = container.scrollLeft + step * directionRef.current;

      if (next >= maxScroll - 4) {
        next = maxScroll;
        directionRef.current = -1;
      } else if (next <= 4) {
        next = 0;
        directionRef.current = 1;
      }

      container.scrollTo({ left: next, behavior: 'smooth' });
    }, 3000);

    return () => clearInterval(timer);
  }, [items.length]);

  return (
    <section className="w-full bg-black py-6">
      <div className="px-4 md:px-8">
        <h2 className="mb-3 text-[16px] font-bold text-white">عروض سريعة</h2>
      </div>

      <div
        ref={scrollRef}
        className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-8"
      >
        {items.map((item) => (
          <button
            key={item._id}
            onClick={() => onSelect(item)}
            className="relative h-64 shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-900 text-left transition-transform active:scale-[0.97] basis-[46%] sm:basis-[31%] lg:basis-[23%] sm:h-72 lg:h-80"
          >
            <div className="relative h-[70%] w-full">
              {item.images?.[0] && (
                <Image
                  src={item.images[0]}
                  alt={item.name?.ar}
                  fill
                  sizes="(min-width: 1024px) 23vw, (min-width: 640px) 31vw, 46vw"
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
            </div>

            <div className="px-3 py-2.5">
              <p className="truncate text-[14px] font-bold text-yellow-400">{item.name?.ar}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">{item.basePrice} ج.م</span>
                {item.oldPrice ? (
                  // ⚠ ACCESSIBILITY FIX: text-white/40 and text-white/50 both
                  // failed Lighthouse contrast against dark backgrounds.
                  // text-gray-400 keeps the muted "crossed-out" look while
                  // passing contrast checks.
                  <span className="text-[11px] text-gray-400 line-through">{item.oldPrice} ج.م</span>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}