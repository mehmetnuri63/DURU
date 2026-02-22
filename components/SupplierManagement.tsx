
import React, { useState, useEffect } from 'react';
import { supabase, Supplier } from '../supabase';
import { Users, Plus, Star, Trash2, Edit2, Phone, Mail, MapPin, Briefcase } from 'lucide-react';

const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    contact_person: '',
    email: '',
    address: '',
    service_areas: [] as string[]
  });
  const [showForm, setShowForm] = useState(false);

  const areas = ['Taze Sebze Meyve', 'Kuru Bakliyat', 'Donuk Gıda', 'Et Ürünleri', 'Pastacılık', 'Unlu Mamulleri', 'Temizlik', 'Kahvaltılık Ürünleri', 'Diğer'];

  const fetchSuppliers = async () => {
    // In a real scenario, we'd join with price analysis to calculate ratings (1-5 stars).
    // For now, we fetch and simulate sorting by "cheapest provider" logic if possible.
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (!error && data) setSuppliers(data);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleToggleArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      service_areas: prev.service_areas.includes(area)
        ? prev.service_areas.filter(a => a !== area)
        : [...prev.service_areas, area]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('suppliers').insert(formData);
    if (!error) {
      setFormData({ name: '', phone: '', contact_person: '', email: '', address: '', service_areas: [] });
      setShowForm(false);
      fetchSuppliers();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">TEDARİKÇİ HAVUZU</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center space-x-2 shadow-lg shadow-blue-100"
        >
          {showForm ? <Trash2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span>{showForm ? 'VAZGEÇ' : 'YENİ TEDARİKÇİ EKLE'}</span>
        </button>
      </div>

      {showForm && (
        <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Firma Adı</label>
              <input 
                required
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Muhatap Kişi</label>
              <input 
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={formData.contact_person}
                onChange={e => setFormData({...formData, contact_person: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Telefon</label>
              <input 
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-Posta</label>
              <input 
                type="email"
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Açık Adres</label>
              <textarea 
                rows={2}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hizmet Alanları</label>
              <div className="flex flex-wrap gap-2">
                {areas.map(area => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => handleToggleArea(area)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      formData.service_areas.includes(area)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 pt-4">
              <button className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg tracking-wider shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
                TEDARİKÇİYİ KAYDET
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-3">
                <h4 className="text-xl font-black text-slate-800 tracking-tight">{s.name}</h4>
                <div className="flex text-amber-400">
                  {/* Rating simulation: Logic should place cheapest providers at top with 5 stars */}
                  {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < (s.rating || 3) ? 'fill-current' : 'text-slate-200'}`} />)}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                <div className="flex items-center space-x-1"><Phone className="w-4 h-4 text-blue-400" /><span>{s.phone}</span></div>
                <div className="flex items-center space-x-1"><Mail className="w-4 h-4 text-blue-400" /><span>{s.email}</span></div>
                <div className="flex items-center space-x-1"><Briefcase className="w-4 h-4 text-blue-400" /><span>{s.contact_person}</span></div>
                <div className="flex items-center space-x-1"><MapPin className="w-4 h-4 text-blue-400" /><span>{s.address}</span></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {s.service_areas?.map(a => <span key={a} className="px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest">{a}</span>)}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-2xl transition-colors"><Edit2 className="w-5 h-5" /></button>
              <button className="p-3 bg-slate-50 text-slate-400 hover:text-red-600 rounded-2xl transition-colors"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplierManagement;
