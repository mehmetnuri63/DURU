
import React, { useState, useEffect } from 'react';
import { supabase, Product, Supplier, PriceOffer } from '../supabase';
import { Tag, Plus, Search, Trash2, Edit2, AlertCircle, FileText, Star, ChevronDown, ChevronRight, Users, Save, Check, Loader2 } from 'lucide-react';

const PriceOffers: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [offers, setOffers] = useState<PriceOffer[]>([]);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});
  const [updatingSuppliers, setUpdatingSuppliers] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    product_id: '',
    supplier_id: '',
    price: 0,
    brand: '',
    features: '',
    note: ''
  });

  const fetchData = async () => {
    const [pRes, sRes, oRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('price_offers').select('*, product:products(*), supplier:suppliers(*)').order('created_at', { ascending: false })
    ]);
    if (pRes.data) setProducts(pRes.data);
    if (sRes.data) setSuppliers(sRes.data);
    if (oRes.data) setOffers(oRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const supplierStats = React.useMemo(() => {
    if (offers.length === 0) return [];

    // 1. Get latest offer for each product-supplier pair to determine "current" best prices
    const latestOffers: Record<string, Record<string, PriceOffer>> = {};
    // offers are already sorted by created_at DESC in fetchData
    offers.forEach(o => {
      if (!latestOffers[o.product_id]) latestOffers[o.product_id] = {};
      if (!latestOffers[o.product_id][o.supplier_id]) {
        latestOffers[o.product_id][o.supplier_id] = o;
      }
    });

    // 2. Find best price for each product among latest offers
    const bestPrices: Record<string, number> = {};
    Object.entries(latestOffers).forEach(([pid, sOffers]) => {
      const prices = Object.values(sOffers).map(so => so.price);
      bestPrices[pid] = Math.min(...prices);
    });

    // 3. Group by supplier
    const grouped: Record<string, { 
      supplier: Supplier, 
      offers: PriceOffer[], 
      bestCount: number 
    }> = {};

    offers.forEach(o => {
      const sId = o.supplier_id;
      if (!grouped[sId]) {
        grouped[sId] = { 
          supplier: o.supplier!, 
          offers: [], 
          bestCount: 0 
        };
      }
      grouped[sId].offers.push(o);
    });

    // Calculate bestCount for each supplier based on latest offers
    Object.entries(latestOffers).forEach(([pid, sOffers]) => {
      const bestPrice = bestPrices[pid];
      Object.entries(sOffers).forEach(([sid, o]) => {
        if (o.price === bestPrice) {
          if (grouped[sid]) {
            grouped[sid].bestCount += 1;
            // Mark this specific offer as best
            const offerIndex = grouped[sid].offers.findIndex(off => off.id === o.id);
            if (offerIndex !== -1) {
              (grouped[sid].offers[offerIndex] as any).isBest = true;
            }
          }
        }
      });
    });

    const result = Object.values(grouped).sort((a, b) => b.bestCount - a.bestCount);
    
    // Calculate max best count for rating
    const maxBest = result.length > 0 ? result[0].bestCount : 0;

    return result.map(item => ({
      ...item,
      rating: item.bestCount === 0 ? 0 : (maxBest > 0 ? Math.max(1, Math.round((item.bestCount / maxBest) * 5)) : 1)
    }));
  }, [offers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !formData.supplier_id || formData.price <= 0) return;

    const { error } = await supabase.from('price_offers').insert(formData);
    if (!error) {
      setFormData({ product_id: '', supplier_id: '', price: 0, brand: '', features: '', note: '' });
      fetchData();
    }
  };

  const handleBulkUpdate = async (supplierId: string, supplierOffers: PriceOffer[]) => {
    const updates = supplierOffers
      .filter(o => editPrices[o.id] !== undefined && parseFloat(editPrices[o.id]) !== o.price)
      .map(o => ({
        id: o.id,
        price: parseFloat(editPrices[o.id])
      }));

    if (updates.length === 0) return;

    setUpdatingSuppliers(prev => ({ ...prev, [supplierId]: true }));
    
    try {
      for (const update of updates) {
        await supabase
          .from('price_offers')
          .update({ price: update.price })
          .eq('id', update.id);
      }
      
      // Clear local edits for this supplier
      const newEdits = { ...editPrices };
      updates.forEach(u => delete newEdits[u.id]);
      setEditPrices(newEdits);
      
      await fetchData();
    } catch (error) {
      console.error('Update error:', error);
      alert('Güncelleme sırasında bir hata oluştu.');
    } finally {
      setUpdatingSuppliers(prev => ({ ...prev, [supplierId]: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center space-x-3 uppercase tracking-tight">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Tag className="w-6 h-6" /></div>
          <span>DIŞ KAYNAK FİYAT TEKLİFİ EKLE</span>
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tedarikçi Seç</label>
            <select
              value={formData.supplier_id}
              onChange={e => setFormData({...formData, supplier_id: e.target.value})}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700"
            >
              <option value="">Tedarikçi...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ürün Seç</label>
            <select
              value={formData.product_id}
              onChange={e => setFormData({...formData, product_id: e.target.value})}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700"
            >
              <option value="">Ürün...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teklif Edilen Fiyat (₺)</label>
            <input
              type="number"
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black text-slate-700"
              value={formData.price}
              onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marka</label>
            <input
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700 uppercase"
              value={formData.brand}
              onChange={e => setFormData({...formData, brand: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Özellik</label>
            <input
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700"
              value={formData.features}
              onChange={e => setFormData({...formData, features: e.target.value})}
            />
          </div>
          <div className="flex items-end">
            <button className="w-full h-[60px] bg-amber-500 text-white rounded-2xl font-black text-sm tracking-widest shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all">
              TEKLİFİ KAYDET
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-6">
          <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
            <FileText className="w-4 h-4" /> TEKLİF ARŞİVİ (TEDARİKÇİ BAZLI)
          </h4>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Fazla Ucuz Ürün Verenler Üsttedir</span>
        </div>

        <div className="space-y-4">
          {supplierStats.map(stat => {
            const isExpanded = expandedSuppliers[stat.supplier.id];
            return (
              <div key={stat.supplier.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                {/* Supplier Row */}
                <div 
                  onClick={() => setExpandedSuppliers(prev => ({ ...prev, [stat.supplier.id]: !isExpanded }))}
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="text-lg font-black text-slate-800 uppercase tracking-tight">{stat.supplier.name}</h5>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">
                          {stat.offers.length} TOPLAM TEKLİF
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded uppercase flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {stat.bestCount} UCUZ ÜRÜN
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-8">
                    {/* Rating Stars */}
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < stat.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                        />
                      ))}
                    </div>

                    <div className="pl-4 border-l border-slate-100">
                      {isExpanded ? <ChevronDown className="w-6 h-6 text-slate-300" /> : <ChevronRight className="w-6 h-6 text-slate-300" />}
                    </div>
                  </div>
                </div>

                {/* Products List (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-slate-50">
                    <div className="p-4 bg-slate-50/30 flex justify-end border-b border-slate-50">
                      <button
                        onClick={() => handleBulkUpdate(stat.supplier.id, stat.offers)}
                        disabled={updatingSuppliers[stat.supplier.id] || !stat.offers.some(o => editPrices[o.id] !== undefined && parseFloat(editPrices[o.id]) !== o.price)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] tracking-widest hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-100"
                      >
                        {updatingSuppliers[stat.supplier.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        FİYATLARI TOPLU GÜNCELLE
                      </button>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ürün</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Birim Fiyat (₺)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Marka/Özellik</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tarih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {stat.offers.map(o => {
                          const currentPrice = editPrices[o.id] !== undefined ? editPrices[o.id] : o.price.toString();
                          const hasChanged = editPrices[o.id] !== undefined && parseFloat(editPrices[o.id]) !== o.price;

                          return (
                            <tr key={o.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-8 py-4 font-bold text-slate-700 uppercase flex items-center gap-2">
                                {o.product?.name}
                                {(o as any).isBest && (
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="relative inline-block">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={currentPrice}
                                    onChange={e => setEditPrices(prev => ({ ...prev, [o.id]: e.target.value }))}
                                    className={`
                                      w-32 px-4 py-1.5 rounded-full font-black text-xs text-center outline-none transition-all border
                                      ${hasChanged 
                                        ? 'bg-blue-50 border-blue-200 text-blue-600 ring-2 ring-blue-100' 
                                        : 'bg-amber-50 border-transparent text-amber-600 focus:border-amber-200'}
                                    `}
                                  />
                                  {hasChanged && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase italic">{o.brand} {o.features ? `/ ${o.features}` : ''}</td>
                              <td className="px-8 py-4 text-right text-[10px] font-black text-slate-400">{new Date(o.created_at).toLocaleDateString('tr-TR')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          {supplierStats.length === 0 && (
            <div className="bg-white p-20 rounded-[2rem] border border-dashed border-slate-200 text-center flex flex-col items-center justify-center space-y-3">
              <FileText className="w-12 h-12 text-slate-100" />
              <p className="text-slate-400 font-medium italic">Henüz kaydedilmiş fiyat teklifi bulunmuyor.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PriceOffers;
