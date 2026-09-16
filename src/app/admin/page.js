'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, RefreshCw, LogOut, Printer, Pencil, X, Plus, Minus } from 'lucide-react';

// ⚠ يفترض متغير بيئة NEXT_PUBLIC_API_URL (كما ورد في الملاحظات المعمارية السابقة).
// إن كان لديك بالفعل ordersApi في lib/api.js، استبدل استدعاء fetch أدناه به لتوحيد النمط.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const ORDERS_URL = `${API_BASE}/orders`;
const MENU_ADMIN_URL = `${API_BASE}/menu/admin/all`;
const MENU_AVAILABILITY_URL = (id) => `${API_BASE}/menu/${id}/availability`;

const POLL_INTERVAL_MS = 15000;

const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

// An item's add-ons have shown up under two different keys across this
// codebase — the Order schema calls the field `options`, the cashier
// cart/checkout UI calls it `selectedOptions`. This reads whichever is
// present so display code doesn't need to care which one a given order
// actually has.
function getItemOptions(item) {
  if (Array.isArray(item.options)) return item.options;
  if (Array.isArray(item.selectedOptions)) return item.selectedOptions;
  return [];
}

// Simple two-tone beep via the Web Audio API — no external sound file needed.
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.18);
    playTone(1046, now + 0.2, 0.22);
  } catch (err) {
    console.error('[beep] failed to play notification sound:', err);
  }
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [editingOrder, setEditingOrder] = useState(null); // order object or null
  const [printingOrder, setPrintingOrder] = useState(null);

  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [showMenuPanel, setShowMenuPanel] = useState(false);

  const knownOrderIdsRef = useRef(new Set());
  const pollRef = useRef(null);

  // ---------------------------------------------------------------------
  // Orders: fetch + poll
  // ---------------------------------------------------------------------

  const fetchOrders = useCallback(
    async (pw, { silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const res = await fetch(ORDERS_URL, {
          headers: { 'x-admin-secret': pw },
        });

        if (res.status === 401) {
          setError('كلمة المرور غير صحيحة');
          setAuthed(false);
          return false;
        }

        if (!res.ok) {
          setError(`تعذر تحميل الطلبات (${res.status})`);
          return false;
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : data.orders ?? [];

        // Detect newly-arrived orders (present now, not in the previous
        // known set) and beep. Skipped on the very first load so opening
        // the dashboard doesn't beep for every existing order.
        const currentIds = new Set(list.map((o) => o._id ?? o.orderNumber));
        if (knownOrderIdsRef.current.size > 0) {
          const hasNewOrder = [...currentIds].some((id) => !knownOrderIdsRef.current.has(id));
          if (hasNewOrder) playBeep();
        }
        knownOrderIdsRef.current = currentIds;

        setOrders(list);
        return true;
      } catch {
        setError('تعذر الاتصال بالخادم');
        return false;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!authed) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      fetchOrders(password, { silent: true });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [authed, password, fetchOrders]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const ok = await fetchOrders(password);
    if (ok) setAuthed(true);
  };

  const handleRefresh = () => fetchOrders(password);

  const handleLogout = () => {
    setAuthed(false);
    setPassword('');
    setOrders([]);
    setError(null);
    knownOrderIdsRef.current = new Set();
  };

  // ---------------------------------------------------------------------
  // Status changes (accept / progress / deliver / cancel)
  // ---------------------------------------------------------------------

  const updateStatus = async (order, status) => {
    try {
      const res = await fetch(`${ORDERS_URL}/${order._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': password },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `تعذر تحديث حالة الطلب #${order.orderNumber}`);
        return;
      }
      const { order: updated } = await res.json();
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    } catch {
      setError('تعذر الاتصال بالخادم');
    }
  };

  // ---------------------------------------------------------------------
  // Edit-before-accept modal
  // ---------------------------------------------------------------------

  const openEditModal = (order) => {
    // Deep-clone so edits don't mutate table state until saved, and
    // normalize each item's add-ons onto a single `options` key regardless
    // of whether the order stored them as `options` or `selectedOptions`.
    const cloned = JSON.parse(JSON.stringify(order));
    cloned.items = cloned.items.map((item) => ({
      ...item,
      options: getItemOptions(item),
    }));
    setEditingOrder(cloned);
  };

  const closeEditModal = () => setEditingOrder(null);

  const updateEditingQuantity = (index, delta) => {
    setEditingOrder((prev) => {
      const items = [...prev.items];
      const nextQty = Math.max(1, items[index].quantity + delta);
      items[index] = { ...items[index], quantity: nextQty };
      return { ...prev, items };
    });
  };

  const removeEditingOption = (itemIndex, optionIndex) => {
    setEditingOrder((prev) => {
      const items = [...prev.items];
      const options = items[itemIndex].options.filter((_, i) => i !== optionIndex);
      items[itemIndex] = { ...items[itemIndex], options };
      return { ...prev, items };
    });
  };

  const updateEditingNotes = (notes) => {
    setEditingOrder((prev) => ({ ...prev, notes }));
  };

  const saveEditedOrder = async () => {
    if (!editingOrder) return null;
    try {
      const res = await fetch(`${ORDERS_URL}/${editingOrder._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': password },
        body: JSON.stringify({ items: editingOrder.items, notes: editingOrder.notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `تعذر حفظ تعديلات الطلب #${editingOrder.orderNumber}`);
        return null;
      }
      const { order: updated } = await res.json();
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      setEditingOrder(null);
      return updated;
    } catch {
      setError('تعذر الاتصال بالخادم');
      return null;
    }
  };

  const saveAndAccept = async () => {
    if (!editingOrder) return;
    const saved = await saveEditedOrder();
    if (saved) await updateStatus(saved, 'accepted');
  };

  // ---------------------------------------------------------------------
  // Printing
  // ---------------------------------------------------------------------

  const handlePrint = (order) => {
    setPrintingOrder(order);
    // Wait a tick so the print-only DOM node is rendered before print() opens.
    setTimeout(() => window.print(), 50);
  };

  // ---------------------------------------------------------------------
  // Menu availability panel
  // ---------------------------------------------------------------------

  const fetchMenu = async () => {
    setMenuLoading(true);
    try {
      const res = await fetch(MENU_ADMIN_URL, { headers: { 'x-admin-secret': password } });
      if (!res.ok) {
        setError('تعذر تحميل قائمة الأصناف');
        return;
      }
      const data = await res.json();
      setMenuItems(data.items ?? []);
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setMenuLoading(false);
    }
  };

  const toggleMenuPanel = () => {
    const next = !showMenuPanel;
    setShowMenuPanel(next);
    if (next && menuItems.length === 0) fetchMenu();
  };

  const toggleItemAvailability = async (item) => {
    const nextAvailable = !item.isAvailable;
    // Optimistic update.
    setMenuItems((prev) => prev.map((m) => (m._id === item._id ? { ...m, isAvailable: nextAvailable } : m)));
    try {
      const res = await fetch(MENU_AVAILABILITY_URL(item._id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': password },
        body: JSON.stringify({ isAvailable: nextAvailable }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      // Roll back on failure.
      setMenuItems((prev) => prev.map((m) => (m._id === item._id ? { ...m, isAvailable: item.isAvailable } : m)));
      setError(`تعذر تحديث توفر الصنف "${item.name?.ar}"`);
    }
  };

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  if (!authed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl bg-white p-6 ring-1 ring-black/5"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#151310]">
            <Lock size={20} className="text-[#FFC629]" />
          </div>
          <h1 className="text-center text-[17px] font-bold text-black">لوحة تحكم الإدارة</h1>
          <p className="mt-1 text-center text-[12px] text-black/45">أدخل كلمة مرور الإدارة للمتابعة</p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            dir="ltr"
            autoFocus
            className="mt-5 w-full rounded-2xl border border-black/10 px-4 py-3 text-center text-[14px] outline-none focus:border-[#FFC629]"
          />

          {error && <p className="mt-3 text-center text-[12px] font-medium text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="mt-4 w-full rounded-full bg-[#FFC629] py-3 text-[14px] font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'جارِ التحقق...' : 'دخول'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8 lg:px-12">
      {/* Print-only receipt — hidden on screen, shown only inside @media print */}
      <PrintReceipt order={printingOrder} />

      <div className="mx-auto max-w-6xl print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-black md:text-[24px]">الطلبات</h1>
            <p className="mt-1 text-[13px] text-black/45">{orders.length} طلب</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMenuPanel}
              className="rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-black ring-1 ring-black/10"
            >
              {showMenuPanel ? 'إخفاء القائمة' : 'توفر الأصناف'}
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black ring-1 ring-black/10 disabled:opacity-50"
              aria-label="تحديث"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black ring-1 ring-black/10"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-[12px] font-medium text-red-600">{error}</p>
        )}

        {showMenuPanel && (
          <MenuAvailabilityPanel
            items={menuItems}
            loading={menuLoading}
            onToggle={toggleItemAvailability}
          />
        )}

        <div className="mt-5 overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <table className="w-full min-w-[760px] text-right text-[13px]">
            <thead>
              <tr className="border-b border-black/5 text-black/45">
                <th className="px-4 py-3 font-semibold">رقم الطلب</th>
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">الأصناف</th>
                <th className="px-4 py-3 font-semibold">الإجمالي</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id ?? order.orderNumber} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 font-semibold text-black">#{order.orderNumber}</td>
                  <td className="px-4 py-3 text-black/70">{order.customer?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-black/70">
                    {(order.items ?? []).map((it) => `${it.nameSnapshot} ×${it.quantity}`).join('، ')}
                  </td>
                  <td className="px-4 py-3 font-bold text-black">{order.total} ج.م</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#FFC629]/20 px-2.5 py-1 text-[11px] font-semibold text-black">
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <button
                          onClick={() => updateStatus(order, nextStatus(order.status))}
                          className="rounded-full bg-[#151310] px-3 py-1.5 text-[11px] font-semibold text-[#FFC629]"
                        >
                          {nextStatusLabel(order.status)}
                        </button>
                      )}
                      <button
                        onClick={() => handlePrint(order)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black hover:bg-black/10"
                        aria-label="طباعة"
                        title="طباعة"
                      >
                        <Printer size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-black/40">
                    لا توجد طلبات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={closeEditModal}
          onQuantityChange={updateEditingQuantity}
          onRemoveOption={removeEditingOption}
          onNotesChange={updateEditingNotes}
          onSave={saveEditedOrder}
          onSaveAndAccept={saveAndAccept}
        />
      )}
    </div>
  );
}

// Linear progression used by the single "advance status" button in the table.
function nextStatus(current) {
  const flow = ['pending', 'delivered'];
  const idx = flow.indexOf(current);
  return idx === -1 || idx === flow.length - 1 ? current : flow[idx + 1];
}

function nextStatusLabel(current) {
  const labels = {
    out_for_delivery: 'تم التوصيل',
  };
  return labels[current] ?? 'تم التوصيل';
}

// ---------------------------------------------------------------------------
// Edit-before-accept modal component
// ---------------------------------------------------------------------------
function EditOrderModal({ order, onClose, onQuantityChange, onRemoveOption, onNotesChange, onSave, onSaveAndAccept }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 print:hidden">
      <div className="w-full max-w-md rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-black">تعديل الطلب #{order.orderNumber}</h2>
          <button onClick={onClose} className="text-black/40 hover:text-black" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto">
          {order.items.map((item, index) => (
            <div key={index} className="rounded-xl bg-gray-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-black">{item.nameSnapshot}</p>
                  <p className="text-[11px] text-black/45">{item.unitPrice} ج.م / للوحدة</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onQuantityChange(index, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-black/10"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center text-[13px] font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => onQuantityChange(index, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-black/10"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* Add-ons (options / selectedOptions) — this is what was
                  missing from the modal: the cashier had no visibility into
                  extras like "جبنة إضافية" or "بدون بصل" when editing. */}
              {(item.options ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-black/5 pt-2">
                  {item.options.map((opt, optIndex) => (
                    <span
                      key={optIndex}
                      className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-black/70 ring-1 ring-black/10"
                    >
                      {opt.name}
                      {opt.priceModifier ? ` (+${opt.priceModifier} ج.م)` : ''}
                      <button
                        onClick={() => onRemoveOption(index, optIndex)}
                        className="text-black/30 hover:text-red-500"
                        aria-label={`إزالة ${opt.name}`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-[12px] font-semibold text-black/60">ملاحظات</label>
          <textarea
            value={order.notes || ''}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-[13px] outline-none focus:border-[#FFC629]"
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onSave}
            className="flex-1 rounded-full bg-white py-2.5 text-[13px] font-semibold text-black ring-1 ring-black/10"
          >
            حفظ فقط
          </button>
          <button
            onClick={onSaveAndAccept}
            className="flex-1 rounded-full bg-[#FFC629] py-2.5 text-[13px] font-bold text-black"
          >
            حفظ وقبول الطلب
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu availability panel
// ---------------------------------------------------------------------------
function MenuAvailabilityPanel({ items, loading, onToggle }) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <h2 className="text-[14px] font-bold text-black">توفر الأصناف</h2>
      {loading && <p className="mt-2 text-[12px] text-black/45">جارِ التحميل...</p>}
      {!loading && items.length === 0 && (
        <p className="mt-2 text-[12px] text-black/45">لا توجد أصناف</p>
      )}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <button
            key={item._id}
            onClick={() => onToggle(item)}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-right ring-1 transition-colors ${
              item.isAvailable
                ? 'bg-green-50 ring-green-200'
                : 'bg-red-50 ring-red-200'
            }`}
          >
            <span className="text-[12px] font-semibold text-black">{item.name?.ar}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                item.isAvailable ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
              }`}
            >
              {item.isAvailable ? 'متاح' : 'غير متاح'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Print-only receipt
// ---------------------------------------------------------------------------
function PrintReceipt({ order }) {
  if (!order) return null;
  return (
    <div className="print-receipt hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt {
            position: absolute;
            inset: 0;
            width: 80mm;
            margin: 0 auto;
            padding: 8px;
            font-family: monospace;
            font-size: 12px;
            direction: rtl;
          }
          .print-receipt h1 { font-size: 14px; margin: 0 0 6px; text-align: center; }
          .print-receipt hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
          .print-receipt .row { display: flex; justify-content: space-between; }
          .print-receipt .item-addon { padding-right: 10px; font-size: 11px; }
          .print-receipt .total { font-weight: bold; font-size: 13px; }
          .print-receipt .notes-box {
            border: 1px solid #000;
            padding: 4px 6px;
            margin: 6px 0;
            font-weight: bold;
          }
          @page { margin: 4mm; }
        }
      `}</style>
      <h1>طلب #{order.orderNumber}</h1>
      <hr />
      {/* Order-level notes, boxed and near the top so the kitchen can't
          miss instructions like "بدون خضار". Previously this only appeared
          at the very bottom, easy to skip past on a thermal strip. */}
      {order.notes && (
        <div className="notes-box">ملاحظات الطلب: {order.notes}</div>
      )}
      <hr />
      {order.items.map((item, i) => {
        const options = Array.isArray(item.options)
          ? item.options
          : Array.isArray(item.selectedOptions)
          ? item.selectedOptions
          : [];
        return (
          <div key={i} style={{ marginBottom: 4 }}>
            <div className="row">
              <span>{item.nameSnapshot} × {item.quantity}</span>
              <span>{item.unitPrice * item.quantity} ج.م</span>
            </div>
            {options.map((opt, oi) => (
              <div className="item-addon" key={oi}>
                + {opt.name}
                {opt.priceModifier ? ` (+${opt.priceModifier} ج.م)` : ''}
              </div>
            ))}
          </div>
        );
      })}
      <hr />
      <div className="row"><span>المجموع الفرعي</span><span>{order.subtotal} ج.م</span></div>
      <div className="row"><span>رسوم التوصيل</span><span>{order.deliveryFee} ج.م</span></div>
      <div className="row total"><span>الإجمالي</span><span>{order.total} ج.م</span></div>
      <hr />
      <p>{order.customer?.fullName} — {order.customer?.phone}</p>
      <p>{order.address}</p>
    </div>
  );
}