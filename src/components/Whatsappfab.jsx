'use client';

// Floating "chat with us on WhatsApp" button, fixed to the bottom-right of
// the viewport on every customer-facing page.
//
// ⚠ Requires NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER (E.164-ish digits only,
// e.g. "201012345678" for an Egyptian number) as an env var.
export default function WhatsAppFAB() {
  const number = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER;
  if (!number) return null;

  const href = `https://wa.me/${number}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-black/20 transition-transform active:scale-95 md:bottom-8 md:right-8"
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="#fff" aria-hidden="true">
        <path d="M16.001 3C9.096 3 3.5 8.596 3.5 15.5c0 2.348.646 4.54 1.77 6.415L3 29l7.27-2.234A12.44 12.44 0 0 0 16 28c6.904 0 12.5-5.596 12.5-12.5S22.905 3 16.001 3Zm0 22.7c-1.95 0-3.77-.53-5.33-1.45l-.382-.226-4.317 1.326 1.372-4.207-.25-.398A9.98 9.98 0 0 1 5.7 15.5c0-5.687 4.614-10.3 10.301-10.3S26.3 9.813 26.3 15.5 21.688 25.7 16.001 25.7Zm5.65-7.712c-.31-.155-1.83-.903-2.113-1.006-.283-.104-.49-.155-.696.155-.207.31-.8 1.006-.98 1.213-.18.207-.362.233-.671.078-.31-.156-1.31-.483-2.494-1.539-.922-.822-1.545-1.837-1.726-2.147-.18-.31-.02-.478.136-.633.14-.14.31-.362.465-.543.155-.18.207-.31.31-.517.104-.207.052-.388-.026-.543-.078-.155-.697-1.68-.955-2.3-.252-.605-.508-.523-.697-.533l-.594-.01c-.207 0-.543.078-.827.388-.284.31-1.084 1.06-1.084 2.583 0 1.523 1.11 2.995 1.264 3.202.155.207 2.185 3.337 5.293 4.679.74.32 1.318.51 1.768.653.743.236 1.42.203 1.955.123.596-.089 1.83-.748 2.088-1.47.259-.723.259-1.343.181-1.47-.077-.128-.284-.207-.594-.362Z" />
      </svg>
    </a>
  );
}