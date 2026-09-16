'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import apiClient from '@/lib/api';

const ADMIN_SECRET_KEY = 'shamina_admin_secret';

const emptyChoice = () => ({ name: '', additionalPrice: '' });
const emptyGroup = () => ({ groupName: '', isRequired: false, choices: [emptyChoice()] });

const emptyForm = () => ({
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  category: '',
  basePrice: '',
  oldPrice: '',
  imageUrl: '',
  isFeaturedOnHome: false,
  optionGroups: [],
});

export default function AdminMenuPage() {
  const [adminSecret, setAdminSecret] = useState('');

  // Auto-restore the admin secret from localStorage on load, so it isn't
  // re-typed on every visit. Convenience only — see chat note on auth.
  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_SECRET_KEY);
    if (saved) setAdminSecret(saved);
  }, []);

  function handleAdminSecretChange(value) {
    setAdminSecret(value);
    if (value) {
      localStorage.setItem(ADMIN_SECRET_KEY, value);
    } else {
      localStorage.removeItem(ADMIN_SECRET_KEY);
    }
  }

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await apiClient.get('/menu/admin/all');
      setItems(res.data.items ?? []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function authHeaders() {
    return { headers: { 'x-admin-secret': adminSecret } };
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm());
    setSaveError(null);
    setIsModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item._id);
    setForm({
      nameAr: item.name?.ar || '',
      nameEn: item.name?.en || '',
      descriptionAr: item.description?.ar || '',
      descriptionEn: item.description?.en || '',
      category: item.category || '', // plain string now, no ObjectId shape to unwrap
      basePrice: String(item.basePrice ?? ''),
      oldPrice: item.oldPrice != null ? String(item.oldPrice) : '',
      imageUrl: item.images?.[0] || '',
      isFeaturedOnHome: Boolean(item.isFeaturedOnHome),
      optionGroups: (item.optionGroups || []).map((g) => ({
        groupName: g.groupName || '',
        isRequired: Boolean(g.isRequired),
        choices: (g.choices || []).map((c) => ({
          name: c.name || '',
          additionalPrice: String(c.additionalPrice ?? 0),
        })),
      })),
    });
    setSaveError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addGroup() {
    setForm((prev) => ({ ...prev, optionGroups: [...prev.optionGroups, emptyGroup()] }));
  }

  function removeGroup(gIndex) {
    setForm((prev) => ({ ...prev, optionGroups: prev.optionGroups.filter((_, i) => i !== gIndex) }));
  }

  function updateGroup(gIndex, field, value) {
    setForm((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.map((g, i) => (i === gIndex ? { ...g, [field]: value } : g)),
    }));
  }

  function addChoice(gIndex) {
    setForm((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.map((g, i) =>
        i === gIndex ? { ...g, choices: [...g.choices, emptyChoice()] } : g
      ),
    }));
  }

  function removeChoice(gIndex, cIndex) {
    setForm((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.map((g, i) =>
        i === gIndex ? { ...g, choices: g.choices.filter((_, ci) => ci !== cIndex) } : g
      ),
    }));
  }

  function updateChoice(gIndex, cIndex, field, value) {
    setForm((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.map((g, i) =>
        i === gIndex
          ? { ...g, choices: g.choices.map((c, ci) => (ci === cIndex ? { ...c, [field]: value } : c)) }
          : g
      ),
    }));
  }

  async function handleSave() {
    if (!adminSecret) {
      setSaveError('أدخل كلمة سر الأدمن أولاً');
      return;
    }
    setIsSaving(true);
    setSaveError(null);

    const payload = {
      name: { ar: form.nameAr, en: form.nameEn },
      description: { ar: form.descriptionAr, en: form.descriptionEn },
      category: form.category,
      basePrice: Number(form.basePrice),
      oldPrice: form.oldPrice,
      imageUrl: form.imageUrl,
      isFeaturedOnHome: form.isFeaturedOnHome,
      optionGroups: form.optionGroups,
    };

    try {
      if (editingId) {
        await apiClient.put(`/menu/${editingId}`, payload, authHeaders());
      } else {
        await apiClient.post('/menu', payload, authHeaders());
      }
      setIsModalOpen(false);
      loadItems();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!adminSecret) {
      alert('أدخل كلمة سر الأدمن أولاً');
      return;
    }
    if (!confirm(`حذف "${item.name?.ar}" نهائياً؟`)) return;
    try {
      await apiClient.delete(`/menu/${item._id}`, authHeaders());
      loadItems();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggleAvailability(item) {
    try {
      await apiClient.patch(`/menu/${item._id}/availability`, {});
      loadItems();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">إدارة المنيو</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-full bg-[#FFC629] px-4 py-2.5 text-[13px] font-bold text-black"
        >
          <Plus size={16} /> صنف جديد
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-black/10 bg-white p-4">
        <label className="mb-1.5 block text-[12px] font-semibold text-black/60">
          كلمة سر الأدمن (لازمة للحفظ أو الحذف — تُحفظ تلقائياً في هذا المتصفح)
        </label>
        <input
          type="password"
          value={adminSecret}
          onChange={(e) => handleAdminSecretChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[13px] text-gray-900"
          placeholder="ADMIN_SECRET"
        />
      </div>

      {isLoading && <p className="text-gray-500">جارِ التحميل...</p>}
      {loadError && <p className="text-red-600">{loadError}</p>}

      {!isLoading && !loadError && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item._id} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-black">{item.name?.ar}</p>
                  <p className="text-[12px] text-black/50">{item.basePrice} ج.م · {item.category}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                    item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {item.isAvailable ? 'متاح' : 'غير متاح'}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEditModal(item)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-black/5 py-2 text-[12px] font-semibold text-black"
                >
                  <Pencil size={13} /> تعديل
                </button>
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className="flex flex-1 items-center justify-center rounded-lg bg-black/5 py-2 text-[12px] font-semibold text-black"
                >
                  {item.isAvailable ? 'إخفاء' : 'إظهار'}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-2 text-red-600"
                  aria-label="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-black/40">لا توجد أصناف بعد</p>}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-black">{editingId ? 'تعديل الصنف' : 'صنف جديد'}</h2>
              <button onClick={closeModal} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                placeholder="الاسم (عربي)"
                value={form.nameAr}
                onChange={(e) => updateField('nameAr', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[13px] text-gray-900"
              />
              <input
                placeholder="Name (English)"
                value={form.nameEn}
                onChange={(e) => updateField('nameEn', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[13px] text-gray-900"
              />
              <textarea
                placeholder="الوصف (عربي)"
                value={form.descriptionAr}
                onChange={(e) => updateField('descriptionAr', e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[13px] text-gray-900"
              />
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-black/60">القسم (Category)</label>
                <input
                  placeholder="مثال: كريبات، شاورما، وجبات"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[13px] text-gray-900"
                />
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="السعر الأساسي"
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => updateField('basePrice', e.target.value)}
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-[13px] text-gray-900"
                />
                <input
                  placeholder="السعر قبل الخصم (اختياري)"
                  type="number"
                  value={form.oldPrice}
                  onChange={(e) => updateField('oldPrice', e.target.value)}
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-[13px] text-gray-900"
                />
              </div>
              <input
                placeholder="رابط الصورة"
                value={form.imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[13px] text-gray-900"
              />
              <label className="flex items-center gap-2 text-[13px] text-black/70">
                <input
                  type="checkbox"
                  checked={form.isFeaturedOnHome}
                  onChange={(e) => updateField('isFeaturedOnHome', e.target.checked)}
                  className="h-4 w-4 accent-[#FFC629]"
                />
                إظهار في عروض الرئيسية
              </label>

              <div className="border-t border-black/10 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-black">مجموعات الخيارات</p>
                  <button onClick={addGroup} className="text-[12px] font-semibold text-[#b8891f]">
                    + مجموعة جديدة
                  </button>
                </div>

                {form.optionGroups.map((group, gIndex) => (
                  <div key={gIndex} className="mt-3 rounded-xl border border-black/10 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        placeholder="اسم المجموعة (مثال: أختر الحجم)"
                        value={group.groupName}
                        onChange={(e) => updateGroup(gIndex, 'groupName', e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-[12px] text-gray-900"
                      />
                      <button onClick={() => removeGroup(gIndex)} className="text-red-500" aria-label="حذف المجموعة">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <label className="mt-2 flex items-center gap-2 text-[12px] text-black/70">
                      <input
                        type="checkbox"
                        checked={group.isRequired}
                        onChange={(e) => updateGroup(gIndex, 'isRequired', e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#FFC629]"
                      />
                      مجموعة مطلوبة (اختيار واحد إجباري — راديو). غير محددة = اختيارية (تشك بوكس)
                    </label>

                    <div className="mt-2 space-y-1.5">
                      {group.choices.map((choice, cIndex) => (
                        <div key={cIndex} className="flex items-center gap-2">
                          <input
                            placeholder="اسم الاختيار"
                            value={choice.name}
                            onChange={(e) => updateChoice(gIndex, cIndex, 'name', e.target.value)}
                            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-[12px] text-gray-900"
                          />
                          <input
                            placeholder="السعر الإضافي"
                            type="number"
                            value={choice.additionalPrice}
                            onChange={(e) => updateChoice(gIndex, cIndex, 'additionalPrice', e.target.value)}
                            className="w-24 rounded-lg border border-gray-300 px-2.5 py-1.5 text-[12px] text-gray-900"
                          />
                          <button
                            onClick={() => removeChoice(gIndex, cIndex)}
                            className="text-red-400"
                            aria-label="حذف الاختيار"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addChoice(gIndex)} className="text-[11px] font-semibold text-[#b8891f]">
                        + اختيار
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {saveError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600">{saveError}</p>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full rounded-full bg-[#FFC629] py-3 text-[14px] font-bold text-black disabled:opacity-50"
              >
                {isSaving ? 'جارِ الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}