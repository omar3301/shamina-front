'use client';

import { useState } from 'react';
import Image from 'next/image';
import ItemDetailsSheet from './ItemDetailsSheet';

const CATEGORIES = [
  { id: 'all', label: 'الكل' },
  { id: 'crepe', label: 'الكريب' },
  { id: 'meals', label: 'الوجبات الغربي' },
  { id: 'shawarma', label: 'شاورما' },
  { id: 'pizza', label: 'بيتزا' },
];

// Mock data — بنفس أسماء وأسعار الأصناف الحقيقية من seed.js
const MENU_ITEMS = [
  {
    id: 'shamina-crepe',
    name: 'كريب شامينا',
    category: 'crepe',
    price: 160,
    image: '/offers/offer1.jpg',
    description: 'كريب شامينا الخاص بحشوة غنية، حجم XL',
    optionGroups: [],
  },
  {
    id: 'mix-chicken-crepe',
    name: 'كريب ميكس تشكن',
    category: 'crepe',
    price: 140,
    image: '/offers/offer1.jpg',
    description: 'كريب فراخ مشكل بصوص الشيف الخاص',
    optionGroups: [],
  },
  {
    id: 'potato-crepe',
    name: 'كريب بطاطس',
    category: 'crepe',
    price: 75,
    image: '/offers/offer1.jpg',
    optionGroups: [],
  },
  {
    id: 'shamina-meal',
    name: 'وجبة شامينا',
    category: 'meals',
    price: 260,
    image: '/offers/offer2.jpg',
    description: 'وجبة كاملة تشمل الطبق الرئيسي والمقبلات',
    optionGroups: [],
  },
  {
    id: 'el-madah-fried-meal',
    name: 'وجبة المداح فرايد',
    category: 'meals',
    price: 265,
    image: '/offers/offer2.jpg',
    optionGroups: [],
  },
  {
    id: 'zinger-meal',
    name: 'وجبة زنجر',
    category: 'meals',
    price: 250,
    image: '/offers/offer2.jpg',
    optionGroups: [],
  },
  {
    id: 'chicken-shawarma-sandwich',
    name: 'ساندوتش شاورما فراخ',
    category: 'shawarma',
    price: 85,
    image: '/offers/offer1.jpg',
    description: 'شاورما فراخ طازجة في خبز صاج مع صوص الثوم الخاص',
    optionGroups: [
      {
        id: 'size',
        title: 'اختر الحجم',
        type: 'single',
        required: true,
        options: [
          { id: 'regular', name: 'عادي', priceModifier: 0 },
          { id: 'medium', name: 'وسط', priceModifier: 15 },
          { id: 'large', name: 'لارج', priceModifier: 35 },
        ],
      },
    ],
  },
  {
    id: 'margherita-pizza',
    name: 'بيتزا مارجريتا',
    category: 'pizza',
    price: 150,
    image: '/offers/offer3.jpg',
    description: 'صوص طماطم طازج، جبنة موتزاريلا، ريحان',
    optionGroups: [
      {
        id: 'extras',
        title: 'إضافات',
        type: 'multiple',
        required: false,
        options: [
          { id: 'extra-mozzarella', name: 'موتزاريلا إضافية', priceModifier: 15 },
          { id: 'side-fries', name: 'بطاطس جانبية', priceModifier: 20 },
        ],
      },
    ],
  },
  {
    id: 'super-supreme-pizza',
    name: 'بيتزا سوبر سوبريم',
    category: 'pizza',
    price: 185,
    image: '/offers/offer3.jpg',
    optionGroups: [
      {
        id: 'extras',
        title: 'إضافات',
        type: 'multiple',
        required: false,
        options: [
          { id: 'extra-mozzarella', name: 'موتزاريلا إضافية', priceModifier: 15 },
          { id: 'side-fries', name: 'بطاطس جانبية', priceModifier: 20 },
        ],
      },
    ],
  },
];

export default function MenuGrid() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  const filteredItems =
    activeCategory === 'all'
      ? MENU_ITEMS
      : MENU_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <div>
      {/* شريط الأقسام — sticky تحت الـ Header مباشرة (top-14 موبايل / top-16 ديسكتوب) */}
      <div className="sticky top-14 z-30 -mx-4 bg-white/95 px-4 py-3 backdrop-blur-sm md:top-16 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
        <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                  active ? 'bg-[#FFC629] text-black' : 'bg-black/5 text-black/60'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* شبكة الأصناف */}
      <div className="mt-4 grid grid-cols-2 gap-3 pb-6 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="group flex flex-col overflow-hidden rounded-2xl bg-white text-right shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-square w-full bg-black/5">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="text-[13px] font-semibold leading-tight text-black md:text-[14px]">{item.name}</p>
              {item.description && (
                <p className="line-clamp-1 text-[11px] text-black/45">{item.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between pt-1">
                <span className="text-[14px] font-bold text-black">{item.price} ج.م</span>
                <span className="rounded-full bg-[#FFC629] px-2.5 py-1 text-[11px] font-bold text-black">
                  إضافة
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <ItemDetailsSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
