import React from 'react';

interface RestaurantLayoutProps {
  children: React.ReactNode;
}

export default function RestaurantLayout({ children }: RestaurantLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {children}
    </div>
  );
}