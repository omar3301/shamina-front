'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const BRAND_YELLOW = '#F5B301';

// يحدد إن كانت الشاشة الحالية بحجم ديسكتوب (>= 768px) للتحكم في نوع حركة الفتح
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

export default function ItemDetailsSheet({ item, onClose }) {
  const isDesktop = useIsDesktop();
  const { addToCart } = useCart();
  const [selections, setSelections] = useState({});

  // استخراج الداتا بشكل دفاعي
  const displayName = item ? item.name?.ar ?? item.name : '';
  const displayDescription = item ? item.description?.ar ?? item.description : '';
  const basePrice = item ? item.basePrice ?? item.price ?? 0 : 0;
  const displayImage = item ? item.images?.[0] ?? item.image : null;
  const optionGroups = item?.optionGroups ?? item?.modifiers ?? [];

  // ضبط الاختيارات المبدئية عند فتح الصنف
  useEffect(() => {
    if (!item) return;
    const initial = {};
    optionGroups.forEach((group) => {
      const groupId = group._id ?? group.id;
      const choices = group.choices || group.options || [];
      const isSingle = group.type === 'single' || group.isRequired || group.required;
      initial[groupId] = isSingle ? choices[0]?._id ?? choices[0]?.id ?? null : [];
    });
    setSelections(initial);
  }, [item, optionGroups]);

  // حساب السعر الإجمالي
  const totalPrice = useMemo(() => {
    if (!item) return 0;
    let total = basePrice;
    
    optionGroups.forEach((group) => {
      const groupId = group._id ?? group.id;
      const choices = group.choices || group.options || [];
      const selected = selections[groupId];
      const isSingle = group.type === 'single' || group.isRequired || group.required;
      
      if (isSingle) {
        const opt = choices.find((o) => (o._id ?? o.id) === selected);
        if (opt) total += opt.additionalPrice ?? opt.priceModifier ?? 0;
      } else {
        (Array.isArray(selected) ? selected : []).forEach((sId) => {
          const opt = choices.find((o) => (o._id ?? o.id) === sId);
          if (opt) total += opt.additionalPrice ?? opt.priceModifier ?? 0;
        });
      }
    });
    return total;
  }, [item, selections, basePrice, optionGroups]);

  // تجهيز قائمة الخيارات لعرضها في السلة
  const selectedOptionsList = useMemo(() => {
    if (!item) return [];
    const list = [];
    
    optionGroups.forEach((group) => {
      const groupId = group._id ?? group.id;
      const choices = group.choices || group.options || [];
      const selected = selections[groupId];
      const isSingle = group.type === 'single' || group.isRequired || group.required;
      
      if (isSingle) {
        const opt = choices.find((o) => (o._id ?? o.id) === selected);
        if (opt) list.push({ name: opt.name?.ar ?? opt.name, priceModifier: opt.additionalPrice ?? opt.priceModifier ?? 0 });
      } else {
        (Array.isArray(selected) ? selected : []).forEach((sId) => {
          const opt = choices.find((o) => (o._id ?? o.id) === sId);
          if (opt) list.push({ name: opt.name?.ar ?? opt.name, priceModifier: opt.additionalPrice ?? opt.priceModifier ?? 0 });
        });
      }
    });
    return list;
  }, [item, selections, optionGroups]);

  const handleAddToCart = () => {
    const normalizedItem = {
      id: item._id ?? item.id,
      name: displayName,
      image: displayImage,
    };
    addToCart(normalizedItem, selectedOptionsList, 1, totalPrice);
    onClose();
  };

  const handleSingleSelect = (groupId, optionId) => {
    setSelections((prev) => ({ ...prev, [groupId]: optionId }));
  };

  const handleMultiToggle = (groupId, optionId) => {
    setSelections((prev) => {
      const current = Array.isArray(prev[groupId]) ? prev[groupId] : [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [groupId]: next };
    });
  };

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* خلفية التعتيم المتدرجة */}
          <motion.div
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* الحاوية المنبثقة بالنمط الداكن الفاخر */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[95] max-h-[90vh] overflow-y-auto rounded-t-[32px] bg-[#141210] border-t border-white/10 text-white md:inset-0 md:m-auto md:h-fit md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-[32px] md:border md:border-white/10 shadow-2xl"
            initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.25, ease: 'easeOut' }
                : { type: 'spring', damping: 30, stiffness: 300 }
            }
          >
            <div className="relative">
              {/* زر الإغلاق */}
              <button
                onClick={onClose}
                className="absolute left-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>

              {/* حاوية صورة الصنف مع تدرج اندماج ناعم */}
              <div className="relative h-56 w-full bg-[#1c1917] md:h-64 overflow-hidden">
                {displayImage && (
                  <Image src={displayImage} alt={displayName} fill className="object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-transparent to-black/20" />
              </div>

              <div className="px-6 pb-6 pt-3 text-right">
                <h2 className="text-[20px] font-black text-white">{displayName}</h2>
                {displayDescription && (
                  <p className="mt-1.5 text-[14px] leading-relaxed text-gray-400">{displayDescription}</p>
                )}
                <p className="mt-3 text-[18px] font-black" style={{ color: BRAND_YELLOW }}>
                  {basePrice} <span className="text-sm font-bold text-gray-400">ج.م</span>
                </p>

                {optionGroups.map((group) => {
                  const groupId = group._id ?? group.id;
                  const groupTitle = group.groupName ?? group.title;
                  const isRequired = group.isRequired ?? group.required;
                  const choices = group.choices || group.options || [];

                  return (
                    <div key={groupId} className="mt-6">
                      <h3 className="text-[15px] font-bold text-gray-200 flex items-center justify-end gap-1.5">
                        {isRequired && (
                          <span className="text-[12px] font-normal text-gray-500">(مطلوب)</span>
                        )}
                        <span>{groupTitle}</span>
                      </h3>

                      <div className="mt-3 space-y-2.5">
                        {choices.map((opt) => {
                          const optId = opt._id ?? opt.id;
                          const optName = opt.name?.ar ?? opt.name;
                          const optPrice = opt.additionalPrice ?? opt.priceModifier ?? 0;
                          const isSingle = group.type === 'single' || isRequired;
                          
                          const checked = isSingle
                            ? selections[groupId] === optId
                            : (Array.isArray(selections[groupId]) ? selections[groupId] : []).includes(optId);

                          return (
                            <label
                              key={optId}
                              className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 transition-all ${
                                checked
                                  ? 'border-[#F5B301] bg-[#F5B301]/10 text-white'
                                  : 'border-white/5 bg-[#1c1917]/70 text-gray-300 hover:border-white/10 hover:bg-[#1c1917]'
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <input
                                  type={isSingle ? 'radio' : 'checkbox'}
                                  name={groupId}
                                  checked={checked}
                                  onChange={() =>
                                    isSingle
                                      ? handleSingleSelect(groupId, optId)
                                      : handleMultiToggle(groupId, optId)
                                  }
                                  className="h-4 w-4 accent-[#F5B301]"
                                />
                                <span className="text-[14px] font-bold">{optName}</span>
                              </div>
                              {optPrice > 0 && (
                                <span className="text-[13px] font-semibold text-gray-400">
                                  +{optPrice} ج.م
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* شريط الإجراء السفلي الشفاف والملتصق */}
              <div className="sticky bottom-0 border-t border-white/10 bg-[#141210]/95 px-6 py-4 backdrop-blur-md z-20">
                <button
                  onClick={handleAddToCart}
                  className="flex w-full items-center justify-between rounded-2xl bg-[#F5B301] px-6 py-4 text-[15px] font-black text-black shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.98]"
                >
                  <span className="text-base font-black">أضف للسلة</span>
                  <span className="text-base font-black">{totalPrice} ج.م</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}