import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// หักดิบระบบ: บังคับใช้ URL ตัวจริงพิกัด 9 ตัวตรงนี้เลย ไม่ผ่าน process.env ตัวเก่าที่ค้างแคช
const supabaseUrl = 'https://lgwyjvzrvvjwqywanfbs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnd3lqdnpydnZqd3F5d2FuZmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTI3NDQsImV4cCI6MjA5NTQ2ODc0NH0.51cexKfj5eyKoYbCFTtvmouBCosm3nlLDyeNbjRDQco',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);