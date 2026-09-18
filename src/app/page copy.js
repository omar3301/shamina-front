'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
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

// Safe field readers — the API sometimes returns the populated/rich shape
// (name.ar, basePrice, images[0]) and sometimes a flatter shape (name,
// price, image). Every render path below goes through these instead of
// reaching into the object directly.
function getItemName(item) {
  return item.name?.ar || item.name || '';
}

function getItemPrice(item) {
  return item.basePrice ?? item.price ?? null;
}

function getItemImage(item) {
  return item.images?.[0] || item.image || null;
}

const GOLD = '#FFC629';

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

  // The hero's main image: first featured item, falling back to the first
  // menu item so the hero never renders empty before data settles.
  const heroImage = getItemImage(offerItems[0] || items[0] || {});

  function openSheet(item) {
    setSelectedItem(item);
    setIsSheetOpen(true);
  }

  function closeSheet() {
    setIsSheetOpen(false);
  }

  return (
    <main className="min-h-screen bg-neutral-950 pb-24 text-white">
      <HeroSection image={heroImage} />

      {offerItems.length > 0 && <QuickOffers items={offerItems} onSelect={openSheet} />}

      <section className="mt-10 px-4 md:px-8">
        {/* Sticky category tabs — glass panel pinned to the top while the
            menu grid scrolls beneath it. */}
        {categories.length > 0 && (
          <div className="sticky top-0 z-20 -mx-4 border-b border-white/5 bg-neutral-950/70 px-4 py-3 backdrop-blur-xl md:mx-0 md:px-8">
            <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CategoryPill
                label="الكل"
                active={activeCategory === 'all'}
                onClick={() => setActiveCategory('all')}
              />
              {categories.map((cat) => (
                <CategoryPill
                  key={cat.id}
                  label={cat.label}
                  active={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                />
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="relative mt-8 animate-pulse rounded-3xl border border-white/10 bg-white/5 p-4 pt-16"
              >
                <div className="absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-2xl bg-white/10 ring-4 ring-neutral-950" />
                <div className="h-3 w-3/4 rounded bg-white/10" />
                <div className="mt-3 h-3 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {loadError && !isLoading && (
          <p className="mt-10 text-center text-[13px] text-white/40">تعذّر تحميل المنيو حالياً</p>
        )}

        {!isLoading && !loadError && (
          <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item, index) => (
              <MenuCard key={item._id} item={item} index={index} onSelect={() => openSheet(item)} />
            ))}
            {visibleItems.length === 0 && (
              <p className="col-span-full py-10 text-center text-[13px] text-white/40">
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
// Hero — large Arabic headline beside a slowly floating hero image, with a
// few small blurred shapes drifting at different speeds behind it for
// depth. This is the one place motion is allowed to be showy; everything
// else in the page stays quiet by comparison.
// ---------------------------------------------------------------------------
function HeroSection({ image }) {
  return (
    <section className="relative overflow-hidden px-4 pb-14 pt-12 md:px-8 md:pt-20">
      {/* Decorative floating shapes — parallax via mismatched durations */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-16 h-40 w-40 rounded-full blur-3xl"
        style={{ backgroundColor: GOLD, opacity: 0.15 }}
        animate={{ y: [0, -24, 0], x: [0, 12, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl"
        animate={{ y: [0, 18, 0], x: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/3 bottom-0 h-16 w-16 rounded-full blur-2xl"
        style={{ backgroundColor: GOLD, opacity: 0.1 }}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <div className="relative z-10 text-right">
          <h1 className="text-4xl font-extrabold leading-[1.15] md:text-6xl">
            طعم يستحق
            <br />
            <span style={{ color: GOLD }}>أن تنتظره</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/50 md:mr-0 md:ml-auto">
            أطباق مختارة بعناية، تُحضّر طازجة كل يوم — اطلب الآن واستمتع بتجربة مختلفة.
          </p>
        </div>

        <div className="relative flex justify-center md:justify-end">
          {image ? (
            <motion.div
              className="relative h-64 w-64 overflow-hidden rounded-[2rem] shadow-2xl shadow-black/60 ring-1 ring-white/10 md:h-80 md:w-80"
              animate={{ y: [0, -18, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image src={image} alt="" fill sizes="320px" className="object-cover" />
            </motion.div>
          ) : (
            <motion.div
              className="h-64 w-64 rounded-[2rem] bg-white/5 ring-1 ring-white/10 md:h-80 md:w-80"
              animate={{ y: [0, -18, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
        active ? 'text-black' : 'border border-white/10 bg-white/5 text-white/60'
      }`}
      style={active ? { backgroundColor: GOLD } : undefined}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Menu card — dark glass body with the image breaking out of the top edge,
// and a scroll-triggered fade/slide reveal staggered by grid position.
// ---------------------------------------------------------------------------
function MenuCard({ item, index, onSelect }) {
  const name = getItemName(item);
  const price = getItemPrice(item);
  const image = getItemImage(item);

  return (
    <motion.button
      onClick={onSelect}
      className="group relative mt-10 rounded-3xl border border-white/10 bg-white/5 p-4 pt-16 text-right backdrop-blur-md transition-transform active:scale-[0.98]"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.08, ease: 'easeOut' }}
    >
      <div className="absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 overflow-hidden rounded-2xl shadow-lg shadow-black/60 ring-4 ring-neutral-950 transition-transform group-hover:scale-105">
        {image && <Image src={image} alt={name} fill sizes="96px" className="object-cover" />}
      </div>
      <p className="text-[13px] font-semibold leading-tight text-white">{name}</p>
      {price != null && (
        <p className="mt-1 text-[13px] font-bold" style={{ color: GOLD }}>
          {price} ج.م
        </p>
      )}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Quick Offers — dark glass, auto-scrolling carousel. Reverses direction
// once it hits either end instead of jump-cutting back to the start.
// ---------------------------------------------------------------------------
function QuickOffers({ items, onSelect }) {
  const scrollRef = useRef(null);
  const directionRef = useRef(1); // 1 = forward, -1 = backward

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
    <section className="w-full px-4 py-6 md:px-8">
      <h2 className="mb-3 text-[16px] font-bold text-white">عروض سريعة</h2>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const name = getItemName(item);
          const price = getItemPrice(item);
          const image = getItemImage(item);

          return (
            <button
              key={item._id}
              onClick={() => onSelect(item)}
              className="relative h-64 shrink-0 snap-start basis-[46%] overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left backdrop-blur-md transition-transform active:scale-[0.97] sm:h-72 sm:basis-[31%] lg:h-80 lg:basis-[23%]"
            >
              <div className="relative h-[70%] w-full">
                {image && (
                  <Image
                    src={image}
                    alt={name}
                    fill
                    sizes="(min-width: 1024px) 23vw, (min-width: 640px) 31vw, 46vw"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />
              </div>

              <div className="px-3 py-2.5">
                <p className="truncate text-[14px] font-bold" style={{ color: GOLD }}>
                  {name}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {price != null && <span className="text-[14px] font-bold text-white">{price} ج.م</span>}
                  {item.oldPrice ? (
                    <span className="text-[11px] text-gray-400 line-through">{item.oldPrice} ج.م</span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}