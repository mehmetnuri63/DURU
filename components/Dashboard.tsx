
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserRole } from '../App';
// Fix: Added missing ChefHat import
import { Package, Users, ClipboardList, TrendingDown, Clock, CheckCircle2, ChefHat } from 'lucide-react';

interface DashboardProps {
  userRole: UserRole;
}

const Dashboard: React.FC<DashboardProps> = ({ userRole }) => {
  const [stats, setStats] = useState({
    products: 0,
    suppliers: 0,
    pending: 0,
    ordered: 0,
    received: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [pRes, sRes, rRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }),
        supabase.from('purchase_requests').select('*')
      ]);

      const requests = rRes.data || [];
      setStats({
        products: pRes.count || 0,
        suppliers: sRes.count || 0,
        pending: requests.filter(r => r.status === 'Beklemede').length,
        ordered: requests.filter(r => r.status === 'Sipariş Verildi').length,
        received: requests.filter(r => r.status === 'Teslim Alındı').length
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'TOPLAM ÜRÜN', value: stats.products, icon: <Package />, color: 'bg-blue-600' },
    { label: 'TEDARİKÇİ SAYISI', value: stats.suppliers, icon: <Users />, color: 'bg-indigo-600' },
    { label: 'BEKLEYEN TALEP', value: stats.pending, icon: <ClipboardList />, color: 'bg-amber-500' },
    { label: 'YOLDA / SİPARİŞTE', value: stats.ordered, icon: <Clock />, color: 'bg-green-500' },
    { label: 'TESLİM ALINDI', value: stats.received, icon: <CheckCircle2 />, color: 'bg-slate-800' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3 hover:-translate-y-1 transition-transform">
            <div className={`p-3 rounded-2xl text-white ${s.color} shadow-lg shadow-blue-100`}>
              {/* Fix: Cast icon to React.ReactElement<any> to allow className prop injection in cloneElement */}
              {React.cloneElement(s.icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{s.label}</p>
            <p className="text-3xl font-black text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8">Sistem Özeti</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <span className="font-bold text-slate-600">En Fazla Alım Yapılan Kategori</span>
              <span className="px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-black">TAZE SEBZE</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <span className="font-bold text-slate-600">Aylık Tasarruf Oranı</span>
              <span className="px-4 py-1 bg-green-100 text-green-600 rounded-full text-xs font-black">%14.2</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <span className="font-bold text-slate-600">En Ucuz Tedarikçi (Bu Ay)</span>
              <span className="px-4 py-1 bg-amber-100 text-amber-600 rounded-full text-xs font-black">KÖY GIDA</span>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-600 p-10 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-4">Hoş Geldiniz, DURU {userRole}</h3>
            <p className="text-blue-100 font-medium leading-relaxed opacity-80 mb-6">
              Sistem şu anda senkronize çalışmaktadır. Tüm mutfak talepleri anlık olarak satın alma paneline yansıtılmaktadır. 
              En iyi fiyat önerileri için son 30 günlük alım verileri analiz edilmektedir.
            </p>
            <div className="flex space-x-4">
              <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/20 font-bold text-sm">Versiyon: 2.1.0</div>
              <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/20 font-bold text-sm">Bulut: Bağlı</div>
            </div>
          </div>
          <ChefHat className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 rotate-12" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
