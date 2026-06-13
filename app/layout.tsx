import './globals.css';
import React from 'react';

export const metadata = {
  title: 'NONTHAWAT.TECH PLATFORM',
  description: 'Multi-Tenant SaaS Infrastructure Hub',
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