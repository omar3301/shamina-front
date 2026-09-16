'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';

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

// The MongoDB MenuItem schema stores bilingual text as { ar, en } objects
// (name, description, optionGroups[].title, optionGroups[].options[].name).
function getLabel(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.ar || field.en || '';
}

export default function ItemDetailsSheet({ item, onClose }) {
  const isDesktop = useIsDesktop();
  const { addToCart } = useCart();
  const [selections, setSelections] = useState({});
  const [quantity, setQuantity] = useState(1);

  // ⚠ DATA MAPPING: reads only the real MenuItem shape now — `basePrice`,
  // `images[]`, `optionGroups[].options` (not `.choices`),
  // `optionGroups[].title` (not `.groupName`), and each option's
  // `priceModifier` (not `.additionalPrice`). The old mock-shape fallbacks
  // (`item.price`, `item.image`, `group.choices`, `group.groupName`) have
  // been removed entirely — this component now assumes live MongoDB data.
  const optionGroups = item?.optionGroups || [];
  const basePrice = Number(item?.basePrice ?? 0);
  const itemName = getLabel(item?.name);
  const itemDescription = getLabel(item?.description);
  const itemImage = item?.images?.[0];

  const groupKey = (group, index) => group._id || group.id || `group-${index}`;
  const optionKey = (option, index) => option._id || option.id || `option-${index}`;

  // Only options explicitly marked isAvailable: false are hidden — options
  // with no isAvailable field at all default to shown, same as the
  // schema's own `default: true`.
  const availableOptions = (group) => (group.options || []).filter((o) => o.isAvailable !== false);

  // A group's UI shape (radio vs checkbox) comes from `group.type`
  // ('single' | 'multiple'), a separate field from `isRequired` (which is
  // used purely for validation below).
  const isSingleGroup = (group) => group.type !== 'multiple';

  // Required groups (of either type) auto-select on load so the item is
  // immediately orderable: single groups pick their default/first option,
  // multiple groups pre-check any options flagged isDefault.
  useEffect(() => {
    if (!item) return;
    const initial = {};
    optionGroups.forEach((group, gIndex) => {
      const gKey = groupKey(group, gIndex);
      const options = availableOptions(group);

      if (isSingleGroup(group)) {
        const defaultOption = options.find((o) => o.isDefault) || options[0];
        initial[gKey] = defaultOption ? optionKey(defaultOption, options.indexOf(defaultOption)) : null;
      } else {
        initial[gKey] = options.filter((o) => o.isDefault).map((o) => optionKey(o, options.indexOf(o)));
      }
    });
    setSelections(initial);
    setQuantity(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?._id]);

  const unitPrice = useMemo(() => {
    let total = basePrice;
    optionGroups.forEach((group, gIndex) => {
      const gKey = groupKey(group, gIndex);
      const selected = selections[gKey];
      const options = availableOptions(group);

      if (isSingleGroup(group)) {
        const option = options.find((o, oIndex) => optionKey(o, oIndex) === selected);
        total += Number(option?.priceModifier ?? 0);
      } else {
        (selected || []).forEach((selKey) => {
          const option = options.find((o, oIndex) => optionKey(o, oIndex) === selKey);
          total += Number(option?.priceModifier ?? 0);
        });
      }
    });
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, selections, basePrice]);

  const grandTotal = unitPrice * quantity;

  const isValid = useMemo(() => {
    if (!item) return false;
    return optionGroups.every((group, gIndex) => {
      if (!group.isRequired) return true;
      const gKey = groupKey(group, gIndex);
      const selected = selections[gKey];
      if (isSingleGroup(group)) return !!selected;
      const minSelect = group.minSelect > 0 ? group.minSelect : 1;
      return (selected || []).length >= minSelect;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, selections]);

  // Shaped to match the backend Order schema's item.options entries
  // ({ groupTitle, name, priceModifier }) so this list can be sent
  // straight through to the cart / order payload without remapping again.
  const selectedOptionsList = useMemo(() => {
    const list = [];
    optionGroups.forEach((group, gIndex) => {
      const gKey = groupKey(group, gIndex);
      const selected = selections[gKey];
      const options = availableOptions(group);
      const groupTitle = getLabel(group.title);

      if (isSingleGroup(group)) {
        const option = options.find((o, oIndex) => optionKey(o, oIndex) === selected);
        if (option) {
          list.push({ groupTitle, name: getLabel(option.name), priceModifier: Number(option.priceModifier ?? 0) });
        }
      } else {
        (selected || []).forEach((selKey) => {
          const option = options.find((o, oIndex) => optionKey(o, oIndex) === selKey);
          if (option) {
            list.push({ groupTitle, name: getLabel(option.name), priceModifier: Number(option.priceModifier ?? 0) });
          }
        });
      }
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, selections]);

  const handleAddToCart = () => {
    if (!item || !isValid) return;
    addToCart(
      { id: item._id, name: itemName, image: itemImage },
      selectedOptionsList,
      quantity,
      unitPrice
    );
    onClose();
  };

  const handleSingleSelect = (gKey, optKey) => {
    setSelections((prev) => ({ ...prev, [gKey]: optKey }));
  };

  const handleMultiToggle = (gKey, optKey, maxSelect) => {
    setSelections((prev) => {
      const current = prev[gKey] || [];
      if (current.includes(optKey)) {
        return { ...prev, [gKey]: current.filter((k) => k !== optKey) };
      }
      if (maxSelect > 0 && current.length >= maxSelect) {
        // Already at the group's cap — ignore further selections rather
        // than silently exceeding maxSelect.
        return prev;
      }
      return { ...prev, [gKey]: [...current, optKey] };
    });
  };

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

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

              <div className="relative aspect-[4/3] w-full bg-black/5">
                {itemImage && (
                  <Image src={itemImage} alt={itemName} fill className="object-contain" />
                )}
              </div>

              <div className="px-5 pb-6 pt-4">
                <h2 className="text-[18px] font-bold text-black">{itemName}</h2>
                {itemDescription && (
                  <p className="mt-1 text-[13px] leading-relaxed text-black/50">{itemDescription}</p>
                )}
                <p className="mt-2 text-[16px] font-bold text-[#FFC629]">{basePrice} ج.م</p>

                {optionGroups.map((group, gIndex) => {
                  const gKey = groupKey(group, gIndex);
                  const isSingle = isSingleGroup(group);
                  const options = availableOptions(group);
                  const selectedCount = isSingle
                    ? (selections[gKey] ? 1 : 0)
                    : (selections[gKey] || []).length;
                  const groupMissing = group.isRequired && selectedCount === 0;
                  const groupTitle = getLabel(group.title);

                  return (
                    <div key={gKey} className="mt-5">
                      <h3 className="text-[14px] font-bold text-black">
                        {groupTitle}
                        {group.isRequired && (
                          <span className="mr-1 text-[11px] font-normal text-red-500">(مطلوب)</span>
                        )}
                      </h3>

                      <div className={`mt-2.5 space-y-2 ${groupMissing ? 'rounded-2xl p-1 ring-1 ring-red-300' : ''}`}>
                        {options.map((option, oIndex) => {
                          const optKey = optionKey(option, oIndex);
                          const checked = isSingle
                            ? selections[gKey] === optKey
                            : (selections[gKey] || []).includes(optKey);
                          const priceModifier = Number(option.priceModifier ?? 0);
                          const optionLabel = getLabel(option.name);

                          return (
                            <label
                              key={optKey}
                              className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition-colors ${
                                checked ? 'border-[#FFC629] bg-[#FFF9E8]' : 'border-black/10 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type={isSingle ? 'radio' : 'checkbox'}
                                  name={gKey}
                                  checked={checked}
                                  onChange={() =>
                                    isSingle
                                      ? handleSingleSelect(gKey, optKey)
                                      : handleMultiToggle(gKey, optKey, group.maxSelect)
                                  }
                                  className="h-4 w-4 accent-[#FFC629]"
                                />
                                <span className="text-[13px] font-medium text-black">{optionLabel}</span>
                              </div>

                              {/* Single-choice groups: absolute final price for this option.
                                  Multiple-choice groups: relative "+X" delta, only when non-zero. */}
                              {isSingle ? (
                                <span className="text-[12px] font-semibold text-black/50">
                                  {basePrice + priceModifier} ج.م
                                </span>
                              ) : (
                                priceModifier !== 0 && (
                                  <span className="text-[12px] font-semibold text-black/50">
                                    {priceModifier > 0 ? '+' : ''}
                                    {priceModifier} ج.م
                                  </span>
                                )
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="mt-6 flex items-center justify-between rounded-2xl bg-black/5 px-4 py-3">
                  <span className="text-[13px] font-semibold text-black">الكمية</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow"
                      aria-label="إنقاص الكمية"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-5 text-center text-[14px] font-bold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow"
                      aria-label="زيادة الكمية"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-black/5 bg-white px-5 py-4">
                <button
                  onClick={handleAddToCart}
                  disabled={!isValid}
                  className="flex w-full items-center justify-between rounded-full bg-[#FFC629] px-5 py-3.5 text-[14px] font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
                >
                  <span>{isValid ? 'أضف للسلة' : 'أكمل الاختيارات المطلوبة'}</span>
                  <span>{grandTotal} ج.م</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}