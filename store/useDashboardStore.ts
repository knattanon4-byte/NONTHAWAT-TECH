'use client';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { Customer, Application, Project, MembershipLevel } from '@/types/database';

interface DashboardState {
  customers: Customer[];
  applications: Application[];
  projects: Record<string, Project[]>; 
  searchQuery: string;
  membershipFilter: MembershipLevel | 'ALL';
  isLoading: boolean;
  selectedCustomerId: string | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setMembershipFilter: (filter: MembershipLevel | 'ALL') => void;
  setSelectedCustomerId: (id: string | null) => void;
  
  // Supabase Sync Operations
  syncInitialDataEngine: () => Promise<void>;
  updateCustomerNameInCloud: (id: string, newName: string) => Promise<void>;
  addApplicationInCloud: (name: string, slug: string) => Promise<void>;
  deleteApplicationInCloud: (id: string) => Promise<void>;
  saveQuotationInCloud: (quotationData: {
    customerName: string;
    items: any[];
    discount: number;
    subtotal: number;
    vat: number;
    total: number;
  }) => Promise<boolean>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  customers: [],
  applications: [],
  projects: {},
  searchQuery: '',
  membershipFilter: 'ALL',
  isLoading: false,
  selectedCustomerId: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setMembershipFilter: (filter) => set({ membershipFilter: filter }),
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),

  // 1. เอนจินดึงข้อมูลสดจาก Supabase
  syncInitialDataEngine: async () => {
    set({ isLoading: true });
    try {
      let { data: dbCustomers, error: errC } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      let { data: dbApps } = await supabase.from('applications').select('*');
      let { data: dbProjects } = await supabase.from('projects').select('*');

      if (errC) return;

      if (!dbCustomers || dbCustomers.length === 0) {
        const { data: seededCustomers } = await supabase.from('customers').insert([
          { name: 'Nova Core Industries', email: 'ops@nova.io', membership_level: 'BLACK', total_projects: 2 },
          { name: 'Hyperion Quantum Labs', email: 'research@hyperion.edu', membership_level: 'RED', total_projects: 1 }
        ]).select();
        
        await supabase.from('applications').insert([
          { name: 'Chronos Telemetry Node', slug: 'chronos-node', status: 'ACTIVE', version: 'v4.12.0' },
          { name: 'Nebula Stream Engine', slug: 'nebula-stream', status: 'ACTIVE', version: 'v2.4.1' }
        ]);

       if (seededCustomers) {
  const safeCustomers = seededCustomers as any[];

  await supabase.from('projects').insert([
    { customer_id: safeCustomers[0].id, name: 'Project singularity-alpha' },
    { customer_id: safeCustomers[0].id, name: 'Project dark-matter-mesh' },
    { customer_id: safeCustomers[1].id, name: 'Project event-horizon-radar' }
  ]);
}
        const { data: rc } = await supabase.from('customers').select('*');
        const { data: ra } = await supabase.from('applications').select('*');
        const { data: rp } = await supabase.from('projects').select('*');
        dbCustomers = rc; dbApps = ra; dbProjects = rp;
      }

   const projectMap: Record<string, Project[]> = {};

    // 🎯 ท่าไม้ตายสร้าง safeProjects สั่งให้ TypeScript หลับตาปล่อยผ่านจุดนี้ร้อยเปอร์เซ็นต์ครับ
    const safeProjects = dbProjects as any[];

    safeProjects?.forEach((proj) => {
      if (!projectMap[proj.customer_id]) projectMap[proj.customer_id] = [];
      projectMap[proj.customer_id].push(proj as any);
    });

    // 🌟 บรรทัดที่ 93 เป็นต้นไป จะต้องเป็นคำสั่ง set({ customers: ... }) ต่อเลยครับบอส!
    set({ customers: dbCustomers as any[] || [], applications: dbApps as any[] || [], projects: projectMap });

      set({ customers: dbCustomers as any[] || [], applications: dbApps as any[] || [], projects: projectMap });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateCustomerNameInCloud: async (id, newName) => {
    await supabase.from('customers').update({ name: newName }).eq('id', id);
    set((state) => ({ customers: state.customers.map(c => c.id === id ? { ...c, name: newName } : c) }));
  },

  addApplicationInCloud: async (name, slug) => {
    const { data } = await supabase.from('applications').insert([{ name, slug, version: 'v1.0.0-PROTOTYPE', status: 'ACTIVE' }]).select().single();
    if (data) {
      set((state) => ({ applications: [data as any, ...state.applications] }));
    }
  },

  deleteApplicationInCloud: async (id) => {
    await supabase.from('applications').delete().eq('id', id);
    set((state) => ({ applications: state.applications.filter((app) => app.id !== id) }));
  },

  // 5. ฟังก์ชันเซฟดราฟต์ใบเสนอราคา (เวอร์ชันหงายการ์ดส่องโค้ด Error ตัวจริง)
  saveQuotationInCloud: async (data) => {
    try {
      const { error } = await supabase
        .from('quotations')
        .insert([
          {
            customer_name_fallback: data.customerName,
            items: data.items,
            discount_rate: data.discount,
            vat_rate: 0.07,
            subtotal: data.subtotal,
            total: data.total,
            status: 'DRAFT'
          }
        ]);

      if (error) {
        // ถ้าคลาวด์ส่ง Error กลับมา ให้พ่นข้อความจริงตรงนี้
        alert(`Supabase Reject Error: ${error.message}\nCode: ${error.code}`);
        return false;
      }
      return true;
    } catch (err: any) {
      // ถ้าพังที่เน็ตเวิร์ก หรือหาคีย์ API ไม่เจอ พ่นค่า Javascript Error ออกมาตรงๆ
      alert(`Runtime Exception: ${err?.message || err}`);
      return false;
    }
  }
}));