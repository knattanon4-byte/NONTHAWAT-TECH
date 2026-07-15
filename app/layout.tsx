import './globals.css';
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "ร้าน เรๅ สาขาศรีนครินทร์ | ระบบจองโต๊ะ",
  description: "ระบบจองคิวและจัดการโต๊ะอาหาร...",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      {/* 🎯 เอา bg-[#FDFBF7] ออกเรียบร้อย เพื่อคืนพื้นที่ความมืดให้ระบบหลักครับบอส */}
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}