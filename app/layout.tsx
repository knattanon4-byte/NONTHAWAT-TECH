import React from 'react';
import '@/app/globals.css'; 
import AppLayout from '@/components/layout/AppLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  // เปลี่ยนชื่อเว็บตรงนี้
  title: 'NONTHAWAT.TECH | Control Hub',
  description: 'Premium Sci-Fi Data Center Matrix Management Workspace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black antialiased select-none">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}