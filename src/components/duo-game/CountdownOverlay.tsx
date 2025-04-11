import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownOverlayProps {
  isActive: boolean;
  secondsRemaining: number;
  message: string;
}

/**
 * A fullscreen overlay that displays a countdown animation
 */
const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  isActive,
  secondsRemaining,
  message
}) => {
  if (!isActive) return null;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="text-center">
            <motion.div
              key={secondsRemaining}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-7xl font-bold text-white mb-4"
            >
              {secondsRemaining > 0 ? secondsRemaining : 'GO!'}
            </motion.div>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-xl text-white"
            >
              {message}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CountdownOverlay;
