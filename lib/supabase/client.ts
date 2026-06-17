import { createClient } from '@supabase/supabase-js';
import { Database } from './types'; // ดึงพิมพ์เขียวสูตรโกงที่เราสร้างไว้ข้าง ๆ มาใช้

// เปลี่ยนกลับมาเป็นตัว m (jwqywamfbs) ให้ถูกต้องตามรหัสโปรเจกต์จริงเรียบร้อยครับบอส
const supabaseUrl = 'https://lgwyjvzrvvjwqywamfbs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ประกาศรอบเดียวเน้น ๆ คลีน ๆ พร้อมเปิดโหมดอัจฉริยะล้างไฟแดงทั้งลำโปรเจกต์ครับ!
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});