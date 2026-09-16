'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartView() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <ShoppingBag size={40} className="text-black/20" />
        <p className="text-[15px] font-semibold text-black/60">السلة فارغة</p>
        <p className="text-[13px] text-black/40">أضف بعض الأصناف الشهية من المنيو</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-40 pt-2 md:px-8 md:pb-8 lg:px-12">
      <div className="space-y-3">
        {cartItems.map((ci) => (
          <div key={ci.cartItemId} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/5">
              {ci.image && <Image src={ci.image} alt={ci.name} fill className="object-cover" />}
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold text-black">{ci.name}</p>
                <button
                  onClick={() => removeFromCart(ci.cartItemId)}
                  className="text-black/30 transition-colors hover:text-black/60"
                  aria-label="حذف الصنف"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {ci.options?.length > 0 && (
                <ul className="mt-0.5 space-y-0.5 text-[11px] text-black/45">
                  {ci.options.map((opt, i) => (
                    <li key={i}>
                      + {opt.name}
                      {opt.priceModifier > 0 ? ` (${opt.priceModifier} ج.م)` : ''}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 rounded-full bg-black/5 px-1 py-1">
                  <button
                    onClick={() => updateQuantity(ci.cartItemId, ci.quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black shadow-sm"
                    aria-label="تقليل الكمية"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-5 text-center text-[13px] font-semibold">{ci.quantity}</span>
                  <button
                    onClick={() => updateQuantity(ci.cartItemId, ci.quantity + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black shadow-sm"
                    aria-label="زيادة الكمية"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <span className="text-[14px] font-bold text-black">
                  {ci.unitPrice * ci.quantity} ج.م
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* شريط الإجمالي/الدفع — ثابت فوق BottomNav على الموبايل، طبيعي ضمن التدفق على الديسكتوب */}
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-black/5 bg-white px-4 py-3 md:static md:mt-6 md:rounded-2xl md:border md:px-6 md:py-4 md:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-black/50">الإجمالي</span>
          <span className="text-[18px] font-bold text-black">{cartTotal} ج.م</span>
        </div>
        <Link
          href="/checkout"
          className="mt-3 flex w-full items-center justify-center rounded-full bg-[#FFC629] py-3.5 text-[14px] font-bold text-black transition-transform active:scale-[0.98]"
        >
          إتمام الطلب
        </Link>
      </div>
    </div>
  );
}
