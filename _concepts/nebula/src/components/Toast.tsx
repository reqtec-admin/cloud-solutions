'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

type ToastProps = {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
};

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/95 px-4 py-3 shadow-neon backdrop-blur-lg"
      >
        {type === 'success' ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : (
          <XCircle className="h-5 w-5 text-rose-400" />
        )}
        <p className="text-sm text-white">{message}</p>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

