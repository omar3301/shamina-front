import CheckoutForm from '@/components/CheckoutForm';

export const metadata = {
  title: 'إتمام الطلب | شامينا المداح',
};

export default function CheckoutPage() {
  return (
    <div className="pt-4">
      <h1 className="px-4 text-[20px] font-bold text-black md:px-8 md:text-[26px] lg:px-12">
        إتمام الطلب
      </h1>
      <CheckoutForm />
    </div>
  );
}
