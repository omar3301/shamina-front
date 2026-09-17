'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

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

  // استخراج الداتا بشكل دفاعي عشان يشتغل مع الـ MongoDB والـ Mock
  const displayName = item ? item.name?.ar ?? item.name : '';
  const displayDescription = item ? item.description?.ar ?? item.description : '';
  const basePrice = item ? item.basePrice ?? item.price ?? 0 : 0;
  const displayImage = item ? item.images?.[0] ?? item.image : null;
  const optionGroups = item?.optionGroups ?? item?.modifiers ?? [];

  // إعادة ضبط الاختيارات عند فتح صنف جديد
  useEffect(() => {
    if (!item) return;
    const initial = {};
    optionGroups.forEach((group) => {
      const groupId = group._id ?? group.id;
      const choices = group.choices || group.options || [];
      const isSingle = group.type === 'single' || group.isRequired || group.required;
      // لو الاختيار إجباري/فردي، اختار أول عنصر افتراضياً، غير كده خليها مصفوفة فاضية
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
        // التأكد إنها مصفوفة قبل عمل لوب عليها
        (Array.isArray(selected) ? selected : []).forEach((sId) => {
          const opt = choices.find((o) => (o._id ?? o.id) === sId);
          if (opt) total += opt.additionalPrice ?? opt.priceModifier ?? 0;
        });
      }
    });
    return total;
  }, [item, selections, basePrice, optionGroups]);

  // تجهيز قائمة الإضافات للسلة
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
          {/* الخلفية المعتمة */}
          <motion.div
            className="fixed inset-0 z-[90] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* المحتوى */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[95] max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-white md:inset-0 md:m-auto md:h-fit md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-[28px]"
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
              <button
                onClick={onClose}
                className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>

              <div className="relative h-52 w-full bg-black/5 md:h-64">
                {displayImage && (
                  <Image src={displayImage} alt={displayName} fill className="object-cover" />
                )}
              </div>

              <div className="px-5 pb-6 pt-4">
                <h2 className="text-[18px] font-bold text-black">{displayName}</h2>
                {displayDescription && (
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{displayDescription}</p>
                )}
                <p className="mt-2 text-[16px] font-bold text-[#FFC629]">{basePrice} ج.م</p>

                {optionGroups.map((group) => {
                  const groupId = group._id ?? group.id;
                  const groupTitle = group.groupName ?? group.title;
                  const isRequired = group.isRequired ?? group.required;
                  const choices = group.choices || group.options || [];

                  return (
                    <div key={groupId} className="mt-5">
                      <h3 className="text-[14px] font-bold text-black">
                        {groupTitle}
                        {isRequired && (
                          <span className="mr-1 text-[11px] font-normal text-gray-500">(مطلوب)</span>
                        )}
                      </h3>

                      <div className="mt-2.5 space-y-2">
                        {choices.map((opt) => {
                          const optId = opt._id ?? opt.id;
                          const optName = opt.name?.ar ?? opt.name;
                          const optPrice = opt.additionalPrice ?? opt.priceModifier ?? 0;
                          
                          // تحديد إن كان الاختيار فردي (إجباري) أو متعدد
                          const isSingle = group.type === 'single' || isRequired;
                          
                          const checked = isSingle
                            ? selections[groupId] === optId
                            : (Array.isArray(selections[groupId]) ? selections[groupId] : []).includes(optId);

                          return (
                            <label
                              key={optId}
                              className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition-colors ${
                                checked ? 'border-[#FFC629] bg-[#FFF9E8]' : 'border-black/10 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type={isSingle ? 'radio' : 'checkbox'}
                                  name={groupId}
                                  checked={checked}
                                  onChange={() =>
                                    isSingle
                                      ? handleSingleSelect(groupId, optId)
                                      : handleMultiToggle(groupId, optId)
                                  }
                                  className="h-4 w-4 accent-[#FFC629]"
                                />
                                <span className="text-[13px] font-medium text-black">{optName}</span>
                              </div>
                              {optPrice > 0 && (
                                <span className="text-[12px] font-semibold text-gray-500">
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

              {/* شريط الإجراء */}
              <div className="sticky bottom-0 border-t border-black/5 bg-white px-5 py-4 z-10">
                <button
                  onClick={handleAddToCart}
                  className="flex w-full items-center justify-between rounded-full bg-[#FFC629] px-5 py-3.5 text-[14px] font-bold text-black transition-transform active:scale-[0.98]"
                >
                  <span>أضف للسلة</span>
                  <span>{totalPrice} ج.م</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}