import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const CUTE_MESSAGES = [
  '제 이름은 로니예요! 👻',
  '흐흐...로니 귀신이다... 👻',
  '둥둥~ ☁️',
  '안녕! 반가워요 ✨',
  '신문과방송 구독관리 🗞️',
  '오늘도 힘찬 하루 보내세요! 🌿',
  '히히 둥실둥실~ 🎈',
  '로그인하고 시작해 볼까요? 🔑'
];

interface FloatingGhostProps {
  size?: number;
  className?: string;
  showSpeechBubble?: boolean;
}

export const FloatingGhost: React.FC<FloatingGhostProps> = ({
  size = 96,
  className = '',
  showSpeechBubble = true,
}) => {
  const [messageIdx, setMessageIdx] = useState(0);
  const [isWiggling, setIsWiggling] = useState(false);

  // 30초마다 자동으로 말풍선 대사 전환
  useEffect(() => {
    if (!showSpeechBubble) return;
    const interval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % CUTE_MESSAGES.length);
    }, 30000);

    return () => clearInterval(interval);
  }, [showSpeechBubble]);

  const handleClick = () => {
    setMessageIdx((prev) => (prev + 1) % CUTE_MESSAGES.length);
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 400);
  };

  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const ghostSrc = baseUrl.endsWith('/') ? `${baseUrl}ghost.png` : `${baseUrl}/ghost.png`;

  return (
    /* Fixed outer wrapper to completely prevent any layout push or jumping */
    <div
      className={`relative flex flex-col items-center justify-end select-none ${className}`}
      style={{
        width: Math.max(150, size * 1.5),
        height: size + 48, // strictly reserved fixed vertical height
      }}
    >
      {/* Fixed Speech Bubble Container - Zero Height Shift */}
      <div className="w-full h-8 relative flex items-center justify-center pointer-events-none mb-1">
        {showSpeechBubble && (
          <AnimatePresence mode="wait">
            <motion.div
              key={messageIdx}
              initial={{ opacity: 0, y: 3, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -3, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute px-3 py-1 bg-white text-slate-800 text-xs font-bold rounded-2xl shadow-sm border border-slate-200/90 whitespace-nowrap pointer-events-auto cursor-pointer"
              onClick={handleClick}
            >
              {CUTE_MESSAGES[messageIdx]}
              {/* Bubble Tail */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-slate-200/90 rotate-45" />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Floating Ghost Body - GPU Transform Only (No Layout Reflow) */}
      <motion.div
        animate={{
          y: [-5, 5, -5],
          rotate: isWiggling ? [0, -8, 8, -4, 0] : [-2.5, 2.5, -2.5],
        }}
        transition={{
          y: {
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          rotate: isWiggling
            ? { duration: 0.4, ease: 'easeOut' }
            : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        className="cursor-pointer group relative flex items-center justify-center shrink-0"
        title="클릭하면 반응해요!"
        style={{ width: size, height: size * 1.07 }}
      >
        <img
          src={ghostSrc}
          alt="로니"
          className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
          onError={(e) => {
            const current = e.currentTarget.getAttribute('src');
            if (current !== '/ghost.png' && current !== 'ghost.png') {
              e.currentTarget.src = '/ghost.png';
            }
          }}
        />
      </motion.div>

      {/* Floating Shadow - Fixed Height Box */}
      <div className="h-3 flex items-center justify-center shrink-0">
        <motion.div
          animate={{
            scaleX: [0.85, 1.15, 0.85],
            opacity: [0.12, 0.22, 0.12],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-16 h-2 bg-slate-400/50 rounded-full blur-[2px]"
        />
      </div>
    </div>
  );
};
