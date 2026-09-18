'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import ItemDetailsSheet from '@/components/ItemDetailsSheet';
import { menuApi } from '@/lib/api';

// --- Helpers ---
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
function getItemName(item) { return item.name?.ar || item.name || ''; }
function getItemPrice(item) { return item.basePrice ?? item.price ?? null; }
function getItemImage(item) { return item.images?.[0] || item.image || null; }

// Brand Colors
const BRAND_YELLOW = '#F5B301'; // لون أقرب لأصفر شامينا
const BRAND_RED = '#8B0000'; // اللون العنابي اللي في أطراف البانر

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
        const res = await menuApi.getAll();
        if (!ignore) setItems(res.data.items ?? []);
      } catch (err) {
        if (!ignore) setLoadError(true);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadMenu();
    return () => { ignore = true; };
  }, []);

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

  const offerItems = useMemo(() => items.filter((i) => i.isFeaturedOnHome), [items]);

  return (
    // الخلفية رمادي داكن جداً (أشيك من الأسود الصريح) ومريحة للعين
    <main className="min-h-screen bg-[#0c0a09] pb-24 text-white font-sans">
      
      {/* 1. Hero Section (Elegant & Static) */}
      <section className="relative w-full overflow-hidden bg-[#141210] border-b border-white/5 pt-12 pb-16 px-4 md:px-8">
        {/* لمسة لونية خفيفة في الخلفية */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F5B301] opacity-[0.03] blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#8B0000] opacity-[0.04] blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto flex flex-col-reverse md:flex-row items-center justify-between gap-8 relative z-10">
          
          <div className="flex-1 text-center md:text-right mt-6 md:mt-0">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-black text-white leading-tight"
            >
              شامينا المداح<br/>
              <span style={{ color: BRAND_YELLOW }}>أصل الطعم السوري</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-4 text-gray-400 text-lg md:text-xl max-w-md mx-auto md:mx-0 leading-relaxed"
            >
              أطباق مختارة بعناية، تُحضّر طازجة كل يوم. اختبر الجودة اللي بتستحقها.
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8">
              <button className="bg-[#F5B301] text-black font-extrabold text-lg py-3 px-8 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95">
                اطلب الآن
              </button>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
            className="flex-1 w-full max-w-md"
          >
            {/* عرض صورة اللوجو أو صورة ثابتة أنيقة تعبر عن المحل */}
            <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-black/20">
               <img src="/logo.png" alt="Shamina" className="w-full h-full object-contain p-8" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Quick Offers (Magazine Style) */}
      {offerItems.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 py-12 md:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="w-2 h-8 rounded-md bg-[#F5B301]"></span>
              عروض التوفير
            </h2>
          </div>
          
          <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {offerItems.map((item) => (
              <OfferCard key={item._id} item={item} onClick={() => { setSelectedItem(item); setIsSheetOpen(true); }} />
            ))}
          </div>
        </section>
      )}

      {/* 3. Menu Categories (Clean & Sticky) */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-10">
        {categories.length > 0 && (
          <div className="sticky top-0 z-30 -mx-4 px-4 py-4 mb-8 bg-[#0c0a09]/90 backdrop-blur-xl border-b border-white/5 md:mx-0 md:px-0">
            <div className="flex gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CategoryPill label="الكل" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
              {categories.map((cat) => (
                <CategoryPill key={cat.id} label={cat.label} active={activeCategory === cat.id} onClick={() => setActiveCategory(cat.id)} />
              ))}
            </div>
          </div>
        )}

        {/* 4. Menu Grid (Premium Cards) */}
        {!isLoading && !loadError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleItems.map((item, index) => (
              <MenuCard key={item._id} item={item} index={index} onClick={() => { setSelectedItem(item); setIsSheetOpen(true); }} />
            ))}
            {visibleItems.length === 0 && (
              <p className="col-span-full py-20 text-center text-gray-500 text-lg">لا توجد أصناف في هذا القسم</p>
            )}
          </div>
        )}
      </section>

      <ItemDetailsSheet item={isSheetOpen ? selectedItem : null} onClose={() => setIsSheetOpen(false)} />
    </main>
  );
}

// --- Components ---

function CategoryPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-xl px-6 py-2.5 text-[15px] font-bold transition-all ${
        active ? 'bg-[#F5B301] text-black shadow-md' : 'bg-[#1a1715] text-gray-400 border border-white/5 hover:bg-[#25211e] hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

// تصميم كارت الأكل (مناسب للصور المربعة العادية عشان تبقى شيك)
function MenuCard({ item, index, onClick }) {
  const name = getItemName(item);
  const price = getItemPrice(item);
  const image = getItemImage(item);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: (index % 4) * 0.05 }}
    >
      <button
        onClick={onClick}
        className="group relative w-full flex flex-col text-right bg-[#141210] rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all hover:shadow-2xl active:scale-[0.98]"
      >
        <div className="relative w-full aspect-[4/3] bg-[#1a1715] overflow-hidden">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">بدون صورة</div>
          )}
          {/* Overlay متدرج عشان يدمج الصورة مع الكارت */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-transparent to-transparent opacity-80" />
        </div>
        
        <div className="p-5 relative z-10 w-full">
          <h3 className="text-lg font-bold text-gray-100 truncate">{name}</h3>
          {price != null && (
            <p className="mt-2 text-xl font-black" style={{ color: BRAND_YELLOW }}>
              {price} <span className="text-sm font-medium text-gray-400">ج.م</span>
            </p>
          )}
        </div>
      </button>
    </motion.div>
  );
}

// تصميم كروت العروض (أعرض شوية وتلفت الانتباه)
function OfferCard({ item, onClick }) {
  const name = getItemName(item);
  const price = getItemPrice(item);
  const image = getItemImage(item);

  return (
    <button
      onClick={onClick}
      className="group relative h-72 shrink-0 snap-start basis-[85%] md:basis-[45%] lg:basis-[30%] rounded-3xl overflow-hidden border border-white/10 bg-[#1a1715] text-right transition-transform active:scale-[0.98]"
    >
      {image && <Image src={image} alt={name} fill sizes="400px" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute bottom-0 w-full p-5">
        <h3 className="text-2xl font-black text-white drop-shadow-md">{name}</h3>
        <div className="mt-2 flex items-center justify-end gap-3">
          {item.oldPrice && <span className="text-sm text-gray-400 line-through">{item.oldPrice} ج.م</span>}
          {price != null && <span className="text-xl font-bold bg-[#F5B301] text-black px-3 py-1 rounded-lg">{price} ج.م</span>}
        </div>
      </div>
    </button>
  );
}