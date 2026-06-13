import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // ถ้า URL ที่เรียกเข้ามาขึ้นต้นด้วย /booking ให้ปล่อยผ่านฉลุย ไม่ต้องตรวจสิทธิ์การล็อกอิน
if (request.nextUrl.pathname.startsWith('/booking')) {
  return NextResponse.next();
}
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('hq_session_token')?.value;

  // 1. ยกเว้นพวกไฟล์รูปภาพระบบไม่ให้มิดเดิ้ลแวร์วิ่งไปขัดขวาง
  if (
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // 2. ถ้ามีตั๋วสิทธิ์อยู่แล้ว แต่จะพยายามเข้าหน้า /login ให้ดีดวาร์ปเข้าหน้าแรกทันที
  if (pathname === '/login' && sessionToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3. กฎเหล็ก: ถ้าไม่มีคุกกี้สิทธิ์ และไม่ได้อยู่ที่หน้า /login ให้ดีดกลับไปหน้าล็อกอินหลักทันที
  if (pathname !== '/login' && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // เปิดโหมดตรวจจับพาร์ทมาตรฐานโรงงาน Next.js
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};