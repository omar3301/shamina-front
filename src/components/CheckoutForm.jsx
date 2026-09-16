'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { ordersApi } from '@/lib/api';

const DELIVERY_FEE = 35;
const PHONE_REGEX = /^01[0125][0-9]{8}$/;

const SAVED_NAME_KEY = 'customerName';
const SAVED_PHONE_KEY = 'customerPhone';
const SAVED_ADDRESS_KEY = 'customerAddress';

export default function CheckoutForm() {
  const { cartItems, cartTotal, clearCart } = useCart();

  const [form, setForm] = useState({ fullName: '', phone: '', address: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);

  const grandTotal = cartTotal + DELIVERY_FEE;

  // استرجاع بيانات العميل المحفوظة من طلب سابق — يوفر عليه إعادة الكتابة في كل مرة
  useEffect(() => {
    try {
      const savedName = localStorage.getItem(SAVED_NAME_KEY);
      const savedPhone = localStorage.getItem(SAVED_PHONE_KEY);
      const savedAddress = localStorage.getItem(SAVED_ADDRESS_KEY);

      if (savedName || savedPhone || savedAddress) {
        setForm((prev) => ({
          ...prev,
          fullName: savedName || prev.fullName,
          phone: savedPhone || prev.phone,
          address: savedAddress || prev.address,
        }));
      }
    } catch {
      // localStorage غير متاح (وضع خاص، إلخ) — تجاهل بصمت والاستمرار بحقول فارغة
    }
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'الاسم مطلوب';
    if (!PHONE_REGEX.test(form.phone.trim())) {
      nextErrors.phone = 'رقم هاتف غير صالح (مثال: 01012345678)';
    }
    if (!form.address.trim()) nextErrors.address = 'العنوان مطلوب';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Defensive mapping: cart items may come from an older cart shape (stale
  // localStorage) or the current one. Field names here match the real
  // Order schema exactly (itemId, nameSnapshot, unitPrice, quantity, options)
  // — NOT `price`/`selectedOptions`, which the backend does not accept.
  const buildItemsPayload = () =>
    cartItems
      .map((ci) => {
        const itemId = ci.itemId || ci.id || ci._id;
        const nameSnapshot =
          (typeof ci.name === 'string' && ci.name.trim()) || ci.name?.ar || ci.name?.en || 'صنف';
        const unitPrice = Number(ci.unitPrice ?? ci.price ?? 0);
        const quantity = Number(ci.quantity) > 0 ? Number(ci.quantity) : 1;
        const options = ci.options || ci.selectedOptions || [];
        return { itemId, nameSnapshot, unitPrice, quantity, options };
      })
      // Drop any line that's still missing a real itemId even after fallback —
      // this is stale/corrupt cart data that would otherwise crash the order save.
      .filter((line) => !!line.itemId);

  // تخزين بيانات العميل لطلب لاحق — يُستدعى فقط بعد نجاح إرسال الطلب فعلياً
  const persistCustomerDetails = () => {
    try {
      localStorage.setItem(SAVED_NAME_KEY, form.fullName.trim());
      localStorage.setItem(SAVED_PHONE_KEY, form.phone.trim());
      localStorage.setItem(SAVED_ADDRESS_KEY, form.address.trim());
    } catch {
      // تجاهل بصمت — فشل الحفظ لا يجب أن يمنع إتمام الطلب
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    const itemsPayload = buildItemsPayload();
    if (itemsPayload.length === 0) {
      setSubmitError('السلة تحتوي على بيانات قديمة غير صالحة. برجاء تفريغ السلة وإعادة الإضافة.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      customer: { fullName: form.fullName.trim(), phone: form.phone.trim() },
      address: form.address.trim(),
      notes: form.notes.trim(),
      items: itemsPayload,
      subtotal: cartTotal,
      deliveryFee: DELIVERY_FEE,
      total: grandTotal,
      paymentMethod: 'cash_on_delivery',
    };

    try {
      const res = await ordersApi.create(payload);
      setOrderNumber(res.data.orderNumber ?? null);
      persistCustomerDetails();
      clearCart();
      setOrderPlaced(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full rounded-2xl border px-4 py-3 text-[14px] text-gray-900 bg-white placeholder-gray-500 outline-none transition-colors focus:border-[#FFC629] ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <AnimatePresence mode="wait">
      {orderPlaced ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFC629]"
          >
            <CheckCircle2 size={40} className="text-black" strokeWidth={2.2} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-6 text-[20px] font-bold text-black"
          >
            تم استلام طلبك، شكراً لك!
          </motion.h1>

          {orderNumber && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-1 text-[13px] font-semibold text-black/70"
            >
              رقم الطلب: #{orderNumber}
            </motion.p>
          )}

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-2 max-w-xs text-[13px] leading-relaxed text-black/50"
          >
            سيتواصل معك فريقنا قريباً لتأكيد التفاصيل.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-8 w-full max-w-xs"
          >
            <Link
              href="/"
              className="flex w-full items-center justify-center rounded-full bg-[#151310] py-3.5 text-[14px] font-bold text-white"
            >
              العودة للرئيسية
            </Link>
          </motion.div>
        </motion.div>
      ) : cartItems.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center"
        >
          <p className="text-[15px] font-semibold text-black/60">السلة فارغة</p>
          <Link href="/menu" className="text-[13px] font-semibold text-[#FFC629] underline">
            تصفح المنيو
          </Link>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="pb-40 pt-2 md:pb-10"
        >
          <div className="grid gap-5 md:grid-cols-[1fr_360px] md:items-start">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-black">الاسم بالكامل</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={handleChange('fullName')}
                  placeholder="مثال: أحمد محمد"
                  className={inputClass('fullName')}
                />
                {errors.fullName && <p className="mt-1 text-[11px] text-red-500">{errors.fullName}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-black">رقم الهاتف</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="01012345678"
                  className={`${inputClass('phone')} text-right`}
                />
                {errors.phone && <p className="mt-1 text-[11px] text-red-500">{errors.phone}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-black">العنوان الكامل</label>
                <textarea
                  value={form.address}
                  onChange={handleChange('address')}
                  rows={3}
                  placeholder="المنطقة، اسم الشارع، رقم العقار، الدور، علامة مميزة..."
                  className={inputClass('address')}
                />
                {errors.address && <p className="mt-1 text-[11px] text-red-500">{errors.address}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-black">ملاحظات (اختياري)</label>
                <textarea
                  value={form.notes}
                  onChange={handleChange('notes')}
                  rows={2}
                  placeholder="مثال: بدون بصل، اتصل قبل الوصول..."
                  className={inputClass('notes')}
                />
              </div>

              <div className="rounded-2xl bg-black/5 px-4 py-3">
                <p className="text-[13px] font-semibold text-black">طريقة الدفع</p>
                <p className="mt-0.5 text-[12px] text-black/50">الدفع عند الاستلام (Cash on Delivery)</p>
              </div>

              {submitError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-[12px] font-medium text-red-600">
                  {submitError}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 md:sticky md:top-24">
              <h2 className="text-[14px] font-bold text-black">ملخص الطلب</h2>
              <div className="mt-3 space-y-2">
                {cartItems.map((ci) => (
                  <div key={ci.cartItemId} className="flex items-start justify-between text-[13px]">
                    <span className="text-black/70">
                      {ci.name} × {ci.quantity}
                    </span>
                    <span className="font-semibold text-black">{ci.unitPrice * ci.quantity} ج.م</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1.5 border-t border-black/5 pt-3 text-[13px]">
                <div className="flex justify-between text-black/60">
                  <span>المجموع الفرعي</span>
                  <span>{cartTotal} ج.م</span>
                </div>
                <div className="flex justify-between text-black/60">
                  <span>رسوم التوصيل</span>
                  <span>{DELIVERY_FEE} ج.م</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-black/5 pt-2 text-[15px] font-bold text-black">
                  <span>الإجمالي الكلي</span>
                  <span>{grandTotal} ج.م</span>
                </div>
              </div>
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-16 z-40 border-t border-black/5 bg-white px-4 py-3 md:static md:mt-6 md:border-0 md:px-0 md:py-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#FFC629] py-4 text-[15px] font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-50 md:max-w-xs"
            >
              {isSubmitting ? 'جارِ الإرسال...' : `تأكيد الطلب - ${grandTotal} ج.م`}
            </button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}