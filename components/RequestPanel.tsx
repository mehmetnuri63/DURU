import React, { useState, useEffect } from 'react';
import { supabase, Product, PurchaseRequest, Supplier } from '../supabase';
import {
  ClipboardList, Plus, Clock, Package, Archive,
  ChevronDown, ChevronRight, CheckCircle2, Trash2,
  Info, DollarSign, Calendar, Users, Search
} from 'lucide-react';

interface RequestPanelProps {
  userRole: 'SATINALMA' | 'MUTFAK';
}

const RequestPanel: React.FC<RequestPanelProps> = ({ userRole }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 0,
    brand: '',
    features: '',
    note: ''
  });
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [editData, setEditData] = useState<Record<string, { quantity: number; final_price: number; vat: number }>>({});
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // ✅ Toast + Confirm modal state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void> | void)>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const openConfirm = (title: string, message: string, action: () => Promise<void> | void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const runConfirm = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await confirmAction();
      setConfirmOpen(false);
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  };

  const fetchData = async () => {
    const [pRes, sRes, rRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('purchase_requests')
        .select('*, product:products(*), supplier:suppliers(*)')
        .order('created_at', { ascending: false })
    ]);

    if (pRes.data) setProducts(pRes.data);
    if (sRes.data) setSuppliers(sRes.data);
    if (rRes.data) setRequests(rRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditChange = (id: string, field: 'quantity' | 'final_price' | 'vat', value: number) => {
    const currentReq = requests.find(r => r.id === id);
    if (!currentReq) return;

    setEditData(prev => ({
      ...prev,
      [id]: {
        quantity: prev[id]?.quantity ?? currentReq.quantity,
        final_price: prev[id]?.final_price ?? (currentReq.final_price || 0),
        vat: prev[id]?.vat ?? 1, // Default 1%
        [field]: value
      }
    }));
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || formData.quantity <= 0) return;

    const { error } = await supabase.from('purchase_requests').insert({
      ...formData,
      status: 'Beklemede'
    });

    if (error) {
      showToast('error', 'Talep oluşturulurken hata oluştu!');
      return;
    }

    showToast('success', 'Talep başarıyla gönderildi!');
    setFormData({ product_id: '', quantity: 0, brand: '', features: '', note: '' });
    setProductSearch('');
    fetchData();
  };

  const filteredProducts = products.filter(p => 
    p.name.toLocaleLowerCase('tr-TR').includes(productSearch.toLocaleLowerCase('tr-TR'))
  );

  // ✅ confirm kaldırıldı: silme modal ile
  const deleteRequest = (id: string) => {
    openConfirm('Talebi Sil', 'Bu talebi silmek istediğinize emin misiniz?', async () => {
      const { error } = await supabase.from('purchase_requests').delete().eq('id', id);
      if (error) {
        showToast('error', 'Silme sırasında hata oluştu!');
        return;
      }
      await fetchData();
      showToast('success', 'Talep silindi.');
    });
  };

  // ✅ confirm kaldırıldı: toplu teslim alma modal ile
  const handleReceiveOrder = async (_supplierId: string, orderRequests: PurchaseRequest[]) => {
    openConfirm(
      'Toplu Teslim Al',
      `${orderRequests.length} kalem ürünü güncel değerlerle teslim almak ve arşive taşımak istiyor musunuz?`,
      async () => {
        try {
          const updatePromises = orderRequests.map(req => {
            const edits = editData[req.id];
            const finalQuantity = edits?.quantity ?? req.quantity;
            const basePrice = edits?.final_price ?? (req.final_price || 0);
            const vatRate = edits?.vat ?? 1;
            
            // KDV dahil fiyatı hesapla ve kaydet
            const vatInclusivePrice = basePrice * (1 + vatRate / 100);

            return supabase.from('purchase_requests')
              .update({
                quantity: finalQuantity,
                final_price: vatInclusivePrice,
                status: 'Teslim Alındı'
              })
              .eq('id', req.id);
          });

          const results = await Promise.all(updatePromises);
          const errors = results.filter(r => r.error);

          if (errors.length > 0) {
            const msg = errors.map(e => e.error?.message).filter(Boolean).join(' | ') || 'Bilinmeyen hata';
            showToast('error', `Bazı ürünler teslim alınamadı: ${msg}`);
          } else {
            showToast('success', 'Tüm ürünler başarıyla güncellendi ve arşive eklendi.');
            setEditData({});
          }
        } catch (err: any) {
          showToast('error', 'Beklenmedik bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
        }

        await fetchData();
      }
    );
  };

  const pendingRequests = requests.filter(r => r.status === 'Beklemede');
  const orderedRequests = requests.filter(r => r.status === 'Sipariş Verildi');
  const archivedRequests = requests.filter(r => r.status === 'Teslim Alındı');

  const groupedOrdered = orderedRequests.reduce((acc, req) => {
    const sId = req.supplier_id || 'UNKNOWN';
    if (!acc[sId]) acc[sId] = [];
    acc[sId].push(req);
    return acc;
  }, {} as Record<string, PurchaseRequest[]>);

  const groupedArchived = archivedRequests.reduce((acc, req) => {
    const d = new Date(req.created_at);
    const monthYear = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    const date = d.toLocaleDateString('tr-TR');
    const sName = (req as any).supplier?.name || 'BELİRSİZ FİRMA';

    if (!acc[monthYear]) acc[monthYear] = {};
    if (!acc[monthYear][date]) acc[monthYear][date] = {};
    if (!acc[monthYear][date][sName]) acc[monthYear][date][sName] = [];
    acc[monthYear][date][sName].push(req);
    return acc;
  }, {} as Record<string, Record<string, Record<string, PurchaseRequest[]>>>);

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* 1. YENİ TALEP GİRİŞİ */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center space-x-3 uppercase tracking-tight">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Plus className="w-6 h-6" /></div>
          <span>Yeni Ürün Talebi (Mutfak)</span>
        </h3>
        <form onSubmit={handleRequestSubmit} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div className="md:col-span-2 space-y-1 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ürün Ara & Seç</label>
            <div className="relative z-50">
              <input
                type="text"
                placeholder="Ürün adı yazın (örn: bal, un...)"
                className="w-full px-5 py-4 pl-12 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700 focus:border-blue-400 focus:bg-white transition-all"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                  if (!e.target.value) setFormData({ ...formData, product_id: '' });
                }}
                onFocus={() => setShowProductDropdown(true)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>

            {showProductDropdown && productSearch && (
              <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(p => (
                    <div
                      key={p.id}
                      className="px-5 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center group"
                      onClick={() => {
                        setFormData({ ...formData, product_id: p.id });
                        setProductSearch(p.name);
                        setShowProductDropdown(false);
                      }}
                    >
                      <span className="font-bold text-slate-700 group-hover:text-blue-600 uppercase">{p.name}</span>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{p.unit}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="text-xs font-bold text-slate-400 italic">Eşleşen ürün bulunamadı.</p>
                  </div>
                )}
              </div>
            )}
            {/* Click outside to close */}
            {showProductDropdown && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProductDropdown(false)}
              />
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Miktar</label>
            <input
              type="number"
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marka/Not</label>
            <input
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700 uppercase"
              value={formData.brand}
              onChange={e => setFormData({ ...formData, brand: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button className="w-full h-[60px] bg-blue-600 text-white rounded-2xl font-black text-sm tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
              TALEBİ OLUŞTUR
            </button>
          </div>
        </form>
      </section>

      {/* 2. BEKLEYEN TALEPLER */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3 px-4">
          <Clock className="text-amber-500 w-5 h-5" />
          <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase italic">BEKLEYEN MUTFAK TALEPLERİ</h4>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ürün</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Miktar</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Marka/Özellik</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingRequests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700 uppercase">{req.product?.name}</td>
                  <td className="px-6 py-4 font-black text-blue-600">{req.quantity} {req.product?.unit}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase">{req.brand || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteRequest(req.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {pendingRequests.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic font-medium">Aktif bekleyen talep yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. SİPARİŞİ VERİLENLER & TESLİMAT (DETAYLI) */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3 px-4">
          <Package className="text-green-500 w-5 h-5" />
          <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase italic">YOLDALİ SİPARİŞLER (TESLİMAT BEKLENEN)</h4>
        </div>
        <div className="space-y-6">
          {(Object.entries(groupedOrdered) as [string, PurchaseRequest[]][]).map(([sId, reqs]) => {
            const supplier = suppliers.find(s => s.id === sId);
            const isExpanded = expandedOrders[sId] ?? true;
            const totalAmount = reqs.reduce((sum, r) => {
              const edits = editData[r.id];
              const q = edits?.quantity ?? r.quantity;
              const p = edits?.final_price ?? (r.final_price || 0);
              const v = edits?.vat ?? 1;
              const priceWithVat = p * (1 + v / 100);
              return sum + (priceWithVat * q);
            }, 0);

            return (
              <div key={sId} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-md overflow-hidden animate-in fade-in">
                {/* Header */}
                <div
                  onClick={() => setExpandedOrders({ ...expandedOrders, [sId]: !isExpanded })}
                  className="flex items-center justify-between p-6 bg-slate-50/50 cursor-pointer border-b border-slate-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white text-green-600 rounded-2xl shadow-sm border border-slate-100"><Package className="w-6 h-6" /></div>
                    <div>
                      <h5 className="text-lg font-black text-slate-800 uppercase tracking-tight">{supplier?.name || 'BİLİNMEYEN TEDARİKÇİ'}</h5>
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {reqs.length} Kalem Sipariş Edildi
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GENEL TOPLAM</p>
                      <p className="text-xl font-black text-slate-800">₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReceiveOrder(sId, reqs); }}
                      className="px-8 py-3 bg-green-600 text-white rounded-xl font-black text-xs tracking-widest hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      TOPLU TESLİM AL
                    </button>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-300" /> : <ChevronRight className="w-5 h-5 text-slate-300" />}
                  </div>
                </div>

                {/* Body Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ürün Adı</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Miktar</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Birim Fiyat</th>
                          <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">KDV (%)</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Toplam Fiyat</th>
                          <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {reqs.map(r => {
                          const edits = editData[r.id];
                          const q = edits?.quantity ?? r.quantity;
                          const p = edits?.final_price ?? (r.final_price || 0);
                          const v = edits?.vat ?? 1;
                          const priceWithVat = p * (1 + v / 100);
                          const total = q * priceWithVat;

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-4">
                                <p className="font-bold text-slate-800 uppercase">{r.product?.name}</p>
                                <p className="text-[10px] font-medium text-slate-400 uppercase">{r.brand || 'Standart Marka'}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs text-blue-600 outline-none focus:border-blue-400 transition-colors"
                                    value={q}
                                    onChange={(e) => handleEditChange(r.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  />
                                  <span className="text-[10px] font-black text-slate-400 uppercase">{r.product?.unit}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-1">
                                  <span className="text-slate-400 font-bold">₺</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs text-green-600 outline-none focus:border-green-400 transition-colors"
                                    value={p}
                                    onChange={(e) => handleEditChange(r.id, 'final_price', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="number"
                                  step="1"
                                  className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs text-amber-600 outline-none focus:border-amber-400 transition-colors text-center"
                                  value={v}
                                  onChange={(e) => handleEditChange(r.id, 'vat', parseFloat(e.target.value) || 0)}
                                />
                              </td>
                              <td className="px-8 py-4 text-right font-black text-slate-800">
                                ₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => deleteRequest(r.id)}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                  title="Siparişi İptal Et / Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
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
          {Object.keys(groupedOrdered).length === 0 && (
            <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-slate-200 text-center flex flex-col items-center justify-center space-y-3">
              <Package className="w-12 h-12 text-slate-100" />
              <p className="text-slate-400 font-medium italic">Şu an aktif teslimat beklenmiyor.</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. ARŞİV (ZENGİN GÖRÜNÜM) */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3 px-4">
          <Archive className="text-slate-500 w-5 h-5" />
          <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase italic">SATIN ALMA ARŞİVİ</h4>
        </div>
        <div className="space-y-6">
          {Object.entries(groupedArchived).map(([monthYear, datesMap]) => {
            const monthDates = Object.entries(datesMap);
            
            // Calculate Monthly Totals
            let monthTotalAmount = 0;
            let monthTotalProducts = 0;
            const monthSuppliersSet = new Set<string>();

            monthDates.forEach(([_, suppliersMap]: [string, any]) => {
              Object.entries(suppliersMap).forEach(([sName, items]: [string, any]) => {
                monthSuppliersSet.add(sName);
                monthTotalProducts += items.length;
                items.forEach((i: any) => {
                  monthTotalAmount += (i.final_price || 0) * i.quantity;
                });
              });
            });

            const isMonthExpanded = expandedOrders[`month:${monthYear}`];

            return (
              <div key={monthYear} className="space-y-4">
                {/* AYLIK SATIN ALMA ÖZETİ (EN ÜST SEVİYE) */}
                <div
                  onClick={() => setExpandedOrders(prev => ({ ...prev, [`month:${monthYear}`]: !isMonthExpanded }))}
                  className="bg-slate-800 border border-slate-700 p-6 rounded-[2rem] text-white shadow-xl flex justify-between items-center cursor-pointer hover:-translate-y-1.5 hover:shadow-slate-200/50 transition-all duration-300 group"
                >
                  <div className="flex items-center space-x-5">
                    <div className="p-4 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-transform duration-300">
                      <Archive className="w-7 h-7" />
                    </div>
                    <div>
                      <h5 className="text-xl font-black tracking-tight text-white uppercase">{monthYear}</h5>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AYLIK SATIN ALMA ÖZETİ</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-10">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOPLAM TEDARİKÇİ</p>
                      <p className="text-lg font-black text-white">{monthSuppliersSet.size}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOPLAM ÜRÜN</p>
                      <p className="text-lg font-black text-white">{monthTotalProducts}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AYLIK TOPLAM</p>
                      <p className="text-xl font-black text-blue-400">₺{monthTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="pl-6 border-l border-slate-700">
                      {isMonthExpanded ? <ChevronDown className="w-7 h-7 text-slate-500" /> : <ChevronRight className="w-7 h-7 text-slate-500" />}
                    </div>
                  </div>
                </div>

                {/* GÜNLÜK SATIN ALMALAR */}
                {isMonthExpanded && (
                  <div className="pl-8 space-y-6 border-l-4 border-slate-100 ml-8 animate-in slide-in-from-left-4 duration-500">
                    {monthDates.map(([date, suppliersMap]: [string, any]) => {
                      const dateSuppliers = Object.entries(suppliersMap);
                      const dateTotalAmount = dateSuppliers.reduce((sum, [_, items]: [string, any]) =>
                        sum + items.reduce((s: number, i: any) => s + ((i.final_price || 0) * i.quantity), 0), 0);
                      const dateTotalProducts = dateSuppliers.reduce((sum, [_, items]: [string, any]) => sum + items.length, 0);
                      const dateTotalSuppliers = dateSuppliers.length;
                      const isDateExpanded = expandedOrders[`date:${date}`];

                      return (
                        <div key={date} className="space-y-3">
                          {/* TARİH SATIRI (ORTA SEVİYE) */}
                          <div
                            onClick={() => setExpandedOrders(prev => ({ ...prev, [`date:${date}`]: !isDateExpanded }))}
                            className="bg-white/70 backdrop-blur-md border border-slate-200 p-5 rounded-2xl text-slate-800 shadow-sm flex justify-between items-center cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-300 group"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform duration-300">
                                <Calendar className="w-6 h-6" />
                              </div>
                              <div>
                                <h5 className="text-lg font-black tracking-tight text-slate-800">{date}</h5>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GÜNLÜK SATIN ALMA ÖZETİ</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-8">
                              <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TEDARİKÇİ</p>
                                <p className="text-sm font-black text-slate-700">{dateTotalSuppliers}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ÜRÜN (KALEM)</p>
                                <p className="text-sm font-black text-slate-700">{dateTotalProducts}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GÜNLÜK TOPLAM</p>
                                <p className="text-sm font-black text-blue-600">₺{dateTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div className="pl-4 border-l border-slate-200">
                                {isDateExpanded ? <ChevronDown className="w-6 h-6 text-slate-400" /> : <ChevronRight className="w-6 h-6 text-slate-400" />}
                              </div>
                            </div>
                          </div>

                          {/* TEDARİKÇİLER (ALT SEVİYE) */}
                          {isDateExpanded && (
                            <div className="pl-8 space-y-3 border-l-2 border-slate-200 ml-6 animate-in slide-in-from-left-2 duration-300">
                              {dateSuppliers.map(([sName, items]: [string, any]) => {
                                const sTotalAmount = items.reduce((sum: number, item: any) => sum + ((item.final_price || 0) * item.quantity), 0);
                                const sKey = `supplier:${date}:${sName}`;
                                const isSupplierExpanded = expandedOrders[sKey];

                                return (
                                  <div key={sName} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div
                                      className="p-4 flex justify-between items-center bg-slate-50/30 cursor-pointer hover:bg-slate-50 transition-colors"
                                      onClick={() => setExpandedOrders(prev => ({ ...prev, [sKey]: !isSupplierExpanded }))}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white text-slate-400 rounded-lg border border-slate-100 shadow-sm">
                                          <Users className="w-4 h-4" />
                                        </div>
                                        <h6 className="font-black text-slate-700 uppercase tracking-tight text-sm">{sName}</h6>
                                      </div>
                                      <div className="flex items-center space-x-6">
                                        <div className="text-right">
                                          <p className="text-[8px] font-black text-slate-400 uppercase">ÜRÜN</p>
                                          <p className="text-xs font-black text-slate-600">{items.length} Kalem</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-[8px] font-black text-slate-400 uppercase">TUTAR</p>
                                          <p className="text-xs font-black text-slate-800">₺{sTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        {isSupplierExpanded ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                                      </div>
                                    </div>

                                    {/* ÜRÜNLER */}
                                    {isSupplierExpanded && (
                                      <div className="p-4 bg-white animate-in fade-in duration-300">
                                        <table className="w-full text-left text-[11px]">
                                          <thead>
                                            <tr className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                                              <th className="pb-2">Ürün</th>
                                              <th className="pb-2">Miktar</th>
                                              <th className="pb-2">Birim Fiyat</th>
                                              <th className="pb-2 text-right">Toplam</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                            {items.map((item: any) => (
                                              <tr key={item.id} className="text-slate-600 font-bold">
                                                <td className="py-2 uppercase">{item.product?.name}</td>
                                                <td className="py-2">{item.quantity} {item.product?.unit}</td>
                                                <td className="py-2 text-blue-600">₺{(item.final_price || 0).toFixed(2)}</td>
                                                <td className="py-2 text-right text-slate-800 font-black">₺{((item.final_price || 0) * item.quantity).toFixed(2)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ✅ TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-xl px-4 py-3 shadow-lg text-sm font-bold ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* ✅ CONFIRM MODAL */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !confirmLoading && setConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-black text-slate-800">{confirmTitle}</h3>
            <p className="mt-2 text-sm text-slate-600">{confirmMessage}</p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={confirmLoading}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold disabled:opacity-50"
              >
                Vazgeç
              </button>

              <button
                onClick={runConfirm}
                disabled={confirmLoading}
                className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-semibold disabled:opacity-50"
              >
                {confirmLoading ? 'İşleniyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestPanel;
