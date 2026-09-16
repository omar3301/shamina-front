import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SplashScreen from '@/components/SplashScreen';
import WhatsappFAB from '@/components/Whatsappfab';
export const metadata = {
  title: 'شامينا المداح',
  description: 'اطلب الآن من شامينا المداح',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      
        <body className="min-h-screen overflow-x-hidden bg-[#f8f9fa] text-black antialiased">
          <WhatsappFAB/>
          <CartProvider>
            <SplashScreen />
            <Header />
            <div className="mx-auto max-w-7xl overflow-x-hidden px-4 pb-24 md:px-8 md:pb-0 lg:px-12">
              {children}
            </div>
            <div className="block md:hidden">
              <BottomNav />
            </div>
          </CartProvider>
        </body>
    </html>
  );
}