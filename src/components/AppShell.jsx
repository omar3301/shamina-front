'use client';

import { useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import SplashScreen from './SplashScreen';
import Header from './Header';
import BottomNav from './BottomNav';

export default function AppShell({ children }) {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <LayoutGroup>
      <Header logoVisible={splashDone} />

      <AnimatePresence>
        {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
      </AnimatePresence>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: splashDone ? 1 : 0 }}
        transition={{ duration: 0.5, delay: splashDone ? 0.1 : 0 }}
        className="min-h-screen pb-24 md:pb-10"
      >
        {children}
      </motion.main>

      {/* شريط التنقل السفلي — للموبايل فقط، تحل روابط الـ Header محله في الديسكتوب */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: splashDone ? 1 : 0 }}
        transition={{ duration: 0.4, delay: splashDone ? 0.2 : 0 }}
        className="md:hidden"
      >
        <BottomNav />
      </motion.div>
    </LayoutGroup>
  );
}
