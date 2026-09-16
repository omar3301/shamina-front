const mongoose = require('mongoose');
const { Schema } = mongoose;

// ---------------------------------------------------------------------------
// Option Sub-Schema (a single choice inside a group)
// e.g. { name: "جبنة إضافية", priceModifier: 5 }
//      { name: "بدون بصل", priceModifier: 0 }
// ---------------------------------------------------------------------------
const optionSchema = new Schema(
  {
    name: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    priceModifier: { type: Number, default: 0 }, // can be 0 for "بدون" choices
    isDefault: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: true }
);

// ---------------------------------------------------------------------------
// Option Group Sub-Schema
// A menu item can have several groups: "الحجم", "الإضافات", "استبعاد مكونات"
// ---------------------------------------------------------------------------
const optionGroupSchema = new Schema(
  {
    title: {
      ar: { type: String, required: true }, // "اختر الحجم" / "أضف إضافات" / "بدون"
      en: { type: String, required: true },
    },
    type: {
      type: String,
      enum: ['single', 'multiple'], // single = radio (e.g. size), multiple = checkbox (e.g. extras)
      required: true,
      default: 'single',
    },
    isRequired: { type: Boolean, default: false },
    minSelect: { type: Number, default: 0 },
    maxSelect: { type: Number, default: 1 }, // relevant when type = 'multiple'
    options: [optionSchema],
  },
  { _id: true }
);

const menuItemSchema = new Schema(
  {
    name: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },
    description: {
      ar: { type: String, trim: true },
      en: { type: String, trim: true },
    },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },

    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch' }], // availability per branch

    images: [{ type: String }],

    basePrice: { type: Number, required: true, min: 0 },
    // السعر قبل الخصم — يُعرض بخط مشطوب في واجهة العروض السريعة عند وجوده.
    // اترك هذا الحقل فارغاً للأصناف التي لا تحمل عرضاً حالياً.
    oldPrice: { type: Number, min: 0, default: null },
    currency: { type: String, default: 'EGP' },

    // يحدد ظهور الصنف ضمن قسم "عروض سريعة" في الصفحة الرئيسية للواجهة الأمامية
    isFeaturedOnHome: { type: Boolean, default: false, index: true },

    optionGroups: [optionGroupSchema],

    tags: [{ type: String, enum: ['vegan', 'spicy', 'new', 'best_seller', 'gluten_free', 'chef_special'] }],
    calories: { type: Number },
    preparationTimeMinutes: { type: Number, default: 15 },

    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },

    isAvailable: { type: Boolean, default: true }, // stock/out-of-stock toggle
    isActive: { type: Boolean, default: true }, // soft-delete / hide from menu
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

menuItemSchema.index({ 'name.ar': 'text', 'name.en': 'text', 'description.ar': 'text', 'description.en': 'text' });

// Helper to compute the final price given selected option ids
menuItemSchema.methods.calculatePrice = function (selectedOptionIds = []) {
  let total = this.basePrice;
  this.optionGroups.forEach((group) => {
    group.options.forEach((opt) => {
      if (selectedOptionIds.includes(String(opt._id))) {
        total += opt.priceModifier;
      }
    });
  });
  return total;
};

module.exports = mongoose.model('MenuItem', menuItemSchema);
