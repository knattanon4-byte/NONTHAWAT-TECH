export type MembershipLevel = 'RED' | 'BLACK';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

export interface Customer {
  id: string;
  name: string;
  email: string;
  membership_level: MembershipLevel;
  total_projects: number;
  created_at: string;
}

export interface Application {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DEPRECATED';
  version: string;
}

export interface CustomerApplication {
  id: string;
  customer_id: string;
  application_id: string;
  usage_frequency: number; 
  last_accessed: string;
}

export interface Project {
  id: string;
  customer_id: string;
  name: string;
  payment_status: PaymentStatus;
  cost: number;
}

export interface ServiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Quotation {
  id: string;
  customer_id: string;
  items: ServiceItem[];
  discount_rate: number; 
  vat_rate: number; 
  subtotal: number;
  total: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED';
  created_at: string;
}

export interface BillingCycle {
  id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  amount_due: number;
  is_settled: boolean;
}

export interface RestaurantBooking {
  id: string;
  shop_id: string;
  booking_code: string;
  customer_name: string;
  phone: string;
  booking_date: string;
  booking_time: string;
  guests_count: number;
  table_number: string;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      restaurant_bookings: { Row: RestaurantBooking; Insert: Omit<RestaurantBooking, 'id' | 'created_at'>; Update: Partial<RestaurantBooking> };
      customers: { Row: Customer; Insert: Omit<Customer, 'id' | 'created_at'>; Update: Partial<Customer> };
      applications: { Row: Application; Insert: Omit<Application, 'id'>; Update: Partial<Application> };
      customer_applications: { Row: CustomerApplication; Insert: Omit<CustomerApplication, 'id'>; Update: Partial<CustomerApplication> };
      projects: { Row: Project; Insert: Omit<Project, 'id'>; Update: Partial<Project> };
      quotations: { Row: Quotation; Insert: Omit<Quotation, 'id' | 'created_at'>; Update: Partial<Quotation> };
      billing_cycles: { Row: BillingCycle; Insert: Omit<BillingCycle, 'id'>; Update: Partial<BillingCycle> };
    };
  };
}