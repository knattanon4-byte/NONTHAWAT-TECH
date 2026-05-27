'use client';
import { useEffect } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';

export const useKeyboardShortcuts = () => {
  const { toggleCommandPalette } = useDashboardStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette]);
};