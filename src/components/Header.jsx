'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const NAV_ITEMS = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/menu', label: 'المنيو', icon: UtensilsCrossed },
  { href: '/cart', label: 'السلة', icon: ShoppingCart },
];

export default function Header({ logoVisible = true }) {
  const pathname = usePathname();
  const { cartCount } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-sm">
      {/* الحاوية الداخلية محاذية تماماً لعرض المحتوى الرئيسي (max-w-7xl) بدل الامتداد لحواف الشاشة */}
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:h-16 md:px-8 lg:px-12">
        <motion.div
          layoutId="main-logo"
          animate={{ opacity: logoVisible ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="flex h-10 w-10 items-center justify-center p-1.5 md:h-11 md:w-11"
        >
          <img
            src="/logo.png"
            alt="شامينا المداح"
            className="h-full w-full object-contain mix-blend-multiply"
          />
        </motion.div>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const isCart = href === '/cart';
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
                  active ? 'bg-[#FFC629] text-black' : 'text-black/55 hover:bg-black/5'
                }`}
              >
                <span className="relative">
                  <Icon size={16} strokeWidth={active ? 2.3 : 1.8} />
                  {isCart && cartCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#151310] px-1 text-[9px] font-bold text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="h-10 w-10 md:hidden" />
      </div>
    </header>
  );
}
