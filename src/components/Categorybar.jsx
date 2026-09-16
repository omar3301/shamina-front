'use client';

// Sticky category bar for the customer-facing menu page.
//
// ⚠ Positioning: uses `top-14 md:top-16` (NOT `top-0`) so the bar sticks
// just below the existing fixed/sticky Header instead of scrolling
// underneath it. Adjust the 14/16 values (3.5rem / 4rem) to match your
// actual Header height if it differs.
//
// Props:
//   categories: [{ id, name: { ar, en } }, ...]
//   activeCategoryId: string
//   onSelect: (id) => void
export default function CategoryBar({ categories = [], activeCategoryId, onSelect }) {
  return (
    <div className="sticky top-14 md:top-16 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl overflow-x-auto px-4 md:px-8 lg:px-12">
        <div className="flex w-max gap-2 py-3">
          {categories.map((cat) => {
            const isActive = cat.id === activeCategoryId;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#FFC629] text-black'
                    : 'bg-black/5 text-black/60 hover:bg-black/10'
                }`}
              >
                {cat.name?.ar ?? cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}