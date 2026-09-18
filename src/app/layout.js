import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/Header'; // <-- ضفنا ده
import BottomNav from '@/components/BottomNav';
import SplashScreen from '@/components/SplashScreen';
import WhatsappFAB from '@/components/Whatsappfab';

export const metadata = { title: 'شامينا المداح', description: 'اطلب الآن من شامينا المداح' };
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className="bg-[#0c0a09]">
      <body className="bg-[#0c0a09] text-white min-h-screen m-0 p-0 overflow-x-hidden">
        <WhatsappFAB/>
        <CartProvider>
          <SplashScreen />
          <Header /> {/* <-- رجعناه هنا */}
          
          <div className="pb-24 md:pb-0 w-full">
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