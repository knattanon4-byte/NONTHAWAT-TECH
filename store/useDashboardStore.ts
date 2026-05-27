import { create } from 'zustand';
import { Customer, Application, Project, MembershipLevel, PaymentStatus } from '@/types/database';

interface DashboardState {
  customers: Customer[];
  applications: Application[];
  projects: Record<string, Project[]>; 
  searchQuery: string;
  membershipFilter: MembershipLevel | 'ALL';
  paymentFilter: PaymentStatus | 'ALL';
  isCommandPaletteOpen: boolean;
  selectedCustomerId: string | null;
  
  setSearchQuery: (query: string) => void;
  setMembershipFilter: (filter: MembershipLevel | 'ALL') => void;
  setPaymentFilter: (filter: PaymentStatus | 'ALL') => void;
  toggleCommandPalette: () => void;
  setSelectedCustomerId: (id: string | null) => void;
  updateCustomerName: (id: string, name: string) => void;
  addApplication: (app: Application) => void;
  deleteApplication: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  customers: [
    { id: 'c1', name: 'Nova Core Industries', email: 'ops@nova.io', membership_level: 'BLACK', total_projects: 3, created_at: '2026-01-15' },
    { id: 'c2', name: 'Hyperion Quantum Labs', email: 'research@hyperion.edu', membership_level: 'RED', total_projects: 1, created_at: '2026-02-20' },
    { id: 'c3', name: 'Aether Nexus Group', email: 'billing@aether.net', membership_level: 'BLACK', total_projects: 4, created_at: '2026-03-05' },
  ],
  applications: [
    { id: 'a1', name: 'Chronos Telemetry Node', slug: 'chronos-node', status: 'ACTIVE', version: 'v4.12.0' },
    { id: 'a2', name: 'Nebula Stream Engine', slug: 'nebula-stream', status: 'ACTIVE', version: 'v2.4.1' },
    { id: 'a3', name: 'Vortex Identity Router', slug: 'vortex-auth', status: 'MAINTENANCE', version: 'v1.0.8' },
  ],
  projects: {
    'c1': [
      { id: 'p1', customer_id: 'c1', name: 'Project singularity-alpha', payment_status: 'Paid', cost: 12000 },
      { id: 'p2', customer_id: 'c1', name: 'Project dark-matter-mesh', payment_status: 'Pending', cost: 4500 },
    ],
    'c2': [{ id: 'p3', customer_id: 'c2', name: 'Project event-horizon-radar', payment_status: 'Overdue', cost: 8900 }],
    'c3': [{ id: 'p4', customer_id: 'c3', name: 'Project deep-space-relay', payment_status: 'Paid', cost: 31000 }],
  },
  searchQuery: '',
  membershipFilter: 'ALL',
  paymentFilter: 'ALL',
  isCommandPaletteOpen: false,
  selectedCustomerId: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setMembershipFilter: (filter) => set({ membershipFilter: filter }),
  setPaymentFilter: (filter) => set({ paymentFilter: filter }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),
  updateCustomerName: (id, name) => set((state) => ({
    customers: state.customers.map(c => c.id === id ? { ...c, name } : c)
  })),
  addApplication: (app) => set((state) => ({ applications: [...state.applications, app] })),
  deleteApplication: (id) => set((state) => ({ applications: state.applications.filter(a => a.id !== id) })),
}));