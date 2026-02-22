
import { createClient } from '@supabase/supabase-js';

// Supabase Proje Bilgileri
const supabaseUrl = 'https://gtglsyxiuavenrusrhio.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0Z2xzeXhpdWF2ZW5ydXNyaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQ1OTcsImV4cCI6MjA4NTk0MDU5N30.qDz8V2c3WfM95X6Fn_A3HlfGnrNLxKPwvRfjaWRiOxE';

// Supabase istemcisi oluşturuluyor
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Product = {
  id: string;
  name: string;
  unit: string;
  created_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  contact_person: string;
  email: string;
  address: string;
  service_areas: string[];
  rating?: number;
};

export type PurchaseRequest = {
  id: string;
  product_id: string;
  quantity: number;
  brand?: string;
  features?: string;
  note?: string;
  status: 'Beklemede' | 'Sipariş Verildi' | 'Teslim Alındı';
  created_at: string;
  product?: Product;
  supplier_id?: string;
  order_id?: string;
  final_price?: number;
};

export type PriceOffer = {
  id: string;
  product_id: string;
  supplier_id: string;
  brand?: string;
  features?: string;
  price: number;
  note?: string;
  created_at: string;
  product?: Product;
  supplier?: Supplier;
};
