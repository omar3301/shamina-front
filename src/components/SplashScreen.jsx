'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';

const SESSION_KEY = 'shamina_splash_shown';
const DISPLAY_MS = 2000;

export default function SplashScreen({ onFinish }) {
  const [visible, setVisible] = useState(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  };

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) === 'true';
    } catch {
      // sessionStorage unavailable (private mode, SSR edge case) — just show the splash
    }

    if (alreadyShown) {
      finish();
      return;
    }

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      // Written here (hide-time), not at show-time — see note above on the
      // Strict Mode double-invoke race this avoids.
      try {
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch {}
      finish();
    }, DISPLAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-[#151310]"
        >
          {/* layoutId مشترك مع Header.jsx — ضروري لحركة انتقال اللوجو المشتركة */}
          <motion.div
            layoutId="main-logo"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[100px] w-[100px]"
          >
            <Image src="/logo.png" alt="شامينا المداح" fill priority className="object-contain" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}