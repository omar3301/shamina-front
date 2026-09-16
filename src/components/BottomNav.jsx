'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

// 'Profile' tab removed — guest checkout only, no account surface yet.
const NAV_ITEMS = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/menu', label: 'المنيو', icon: UtensilsCrossed },
  { href: '/cart', label: 'السلة', icon: ShoppingCart },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { cartCount } = useCart();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const isCart = href === '/cart';

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="relative flex flex-col items-center justify-center gap-1 py-2.5"
              >
                <span
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 ${
                    active ? 'bg-[#FFC629]' : 'bg-transparent'
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.3 : 1.8}
                    className={active ? 'text-black' : 'text-black/45'}
                  />
                  {isCart && cartCount > 0 && (
                    <span className="absolute -left-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#151310] px-1 text-[10px] font-bold text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[11px] ${
                    active ? 'font-semibold text-black' : 'font-medium text-black/45'
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
