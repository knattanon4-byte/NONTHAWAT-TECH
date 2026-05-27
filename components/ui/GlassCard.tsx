'use client';
import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'purple' | 'none';
}

export const GlassCard = ({ children, className = '', glowColor = 'none' }: GlassCardProps) => {
  const glowStyles = {
    cyan: 'shadow-[0_0_20px_rgba(34,211,238,0.12)] border-cyan-500/20',
    purple: 'shadow-[0_0_20px_rgba(168,85,247,0.12)] border-purple-500/20',
    none: 'border-slate-800/60 shadow-xl shadow-black/40'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // ใช้ transform-gpu และ will-change เพื่อส่งงานให้การ์ดจอประมวลผลแทน CPU
      className={`backdrop-blur-md bg-slate-950/40 border rounded-2xl p-6 transition-all duration-200 transform-gpu will-change-transform ${glowStyles[glowColor]} ${className}`}
    >
      {children}
    </motion.div>
  );
};