
import React, { useState, useEffect, useMemo } from 'react';
import { supabase, Product, PurchaseRequest, Supplier, PriceOffer } from '../supabase';
import { 
  TrendingDown, ShoppingCart, Copy, Check, 
  ArrowUpRight, Award, DollarSign, AlertTriangle, 
  TrendingUp, Info, Package
} from 'lucide-react';

const PriceAnalysis: React.FC = () => {
  const [activeRequests, setActiveRequests] = useState<PurchaseRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [priceData, setPriceData] = useState<Record<string, Record<string, {price: number, type: string}>>>({});
  const [selectedSupplierForRequest, setSelectedSupplierForRequest] = useState<Record<string, string>>({});
  const [copyNote, setCopyNote] = useState<string | null>(null);

  const fetchData = async () => {
    const { data: reqs } = await supabase.from('purchase_requests').select('*, product:products(*)').eq('status', 'Beklemede');
    const { data: sups } = await supabase.from('suppliers').select('*');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: historicalData } = await supabase.from('purchase_requests')
      .select('product_id, supplier_id, final_price, created_at')
      .eq('status', 'Teslim Alındı')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: offers } = await supabase.from('price_offers')
      .select('product_id, supplier_id, price, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (reqs) setActiveRequests(reqs);
    if (sups) setSuppliers(sups);
    
    const consolidatedPrices: Record<string, Record<string, {price: number, type: string}>> = {};
    
    historicalData?.forEach(d => {
      if (!consolidatedPrices[d.product_id]) consolidatedPrices[d.product_id] = {};
      if (!consolidatedPrices[d.product_id][d.supplier_id] || consolidatedPrices[d.product_id][d.supplier_id].price > (d.final_price || 0)) {
        consolidatedPrices[d.product_id][d.supplier_id] = { price: d.final_price || 0, type: 'SATIN ALMA' };
      }
    });

    offers?.forEach(o => {
      if (!consolidatedPrices[o.product_id]) consolidatedPrices[o.product_id] = {};
      if (!consolidatedPrices[o.product_id][o.supplier_id] || consolidatedPrices[o.product_id][o.supplier_id].price > o.price) {
        consolidatedPrices[o.product_id][o.supplier_id] = { price: o.price, type: 'TEKLİF' };
      }
    });

    setPriceData(consolidatedPrices);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Ürün bazlı en iyi fiyatı bulma
  const getBestPriceInfo = (productId: string) => {
    const productPrices = priceData[productId];
    if (!productPrices) return null;
    let best = { sId: '', price: Infinity };
    Object.entries(productPrices).forEach(([sId, info]: [string, any]) => {
      if (info.price < best.price) best = { sId, price: info.price };
    });
    return best.price === Infinity ? null : best;
  };

  // SADECE EN UCUZ ÜRÜNE SAHİP TEDARİKÇİLERİ FİLTRELEME
  const filteredSuppliers = useMemo(() => {
    const bestSids = new Set<string>();
    activeRequests.forEach(req => {
      const best = getBestPriceInfo(req.product_id);
      if (best) {
        // Aynı en ucuz fiyata sahip birden fazla tedarikçi varsa hepsini ekle
        Object.entries(priceData[req.product_id] || {}).forEach(([sId, info]: [string, any]) => {
          if (info.price === best.price) bestSids.add(sId);
        });
      }
    });
    return suppliers.filter(s => bestSids.has(s.id));
  }, [activeRequests, suppliers, priceData]);

  // MALİYET ANALİZLERİ
  const analysisResult = useMemo(() => {
    let idealTotal = 0;
    let currentTotal = 0;

    activeRequests.forEach(req => {
      const best = getBestPriceInfo(req.product_id);
      if (best) idealTotal += (best.price * req.quantity);

      const selectedSid = selectedSupplierForRequest[req.id];
      if (selectedSid) {
        const price = priceData[req.product_id]?.[selectedSid]?.price || 0;
        currentTotal += (price * req.quantity);
      }
    });

    return {
      idealTotal,
      currentTotal,
      loss: currentTotal > 0 ? Math.max(0, currentTotal - idealTotal) : 0
    };
  }, [activeRequests, priceData, selectedSupplierForRequest]);

  const handleOrder = async (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const orderItems = activeRequests.filter(req => selectedSupplierForRequest[req.id] === supplierId);
    
    if (orderItems.length === 0) {
      alert("Lütfen bu tedarikçi için en az bir ürün seçiniz.");
      return;
    }

    for (const item of orderItems) {
      const priceInfo = priceData[item.product_id]?.[supplierId];
      await supabase.from('purchase_requests')
        .update({ 
          status: 'Sipariş Verildi', 
          supplier_id: supplierId,
          final_price: priceInfo?.price || 0 
        })
        .eq('id', item.id);
    }

    const note = `SİPARİŞ FİŞİ - DURU ERP\n--------------------------\nFirma: ${supplier?.name}\nTarih: ${new Date().toLocaleDateString('tr-TR')}\n\nSipariş Edilen Ürünler:\n` +
      orderItems.map(i => `• ${i.product?.name}: ${i.quantity} ${i.product?.unit}`).join('\n') +
      `\n\n--------------------------\nLütfen teslimat sonrası fatura iletiniz.`;
    
    setCopyNote(note);
    fetchData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ÜST ANALİZ KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 py-4 px-6 rounded-[1.5rem] text-white shadow-lg">
          <TrendingDown className="w-6 h-6 mb-3 text-blue-400" />
          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Mümkün Olan En Ucuz Toplam</h4>
          <p className="text-2xl font-black">₺{analysisResult.idealTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-400 italic">Algoritma tarafından hesaplanan ideal maliyet.</p>
        </div>

        <div className="bg-white py-4 px-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Seçilen Ürünlerin Toplamı</h4>
          <p className={`text-2xl font-black ${analysisResult.currentTotal > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
            ₺{analysisResult.currentTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-2 flex items-center space-x-2">
            <div className={`w-1.5 h-1.5 rounded-full ${analysisResult.currentTotal > 0 ? 'bg-green-500' : 'bg-slate-200'}`}></div>
            <span className="text-[9px] font-black text-slate-400 uppercase">Seçimlere Göre Güncellenir</span>
          </div>
        </div>

        <div className={`py-4 px-6 rounded-[1.5rem] transition-all duration-500 flex flex-col justify-center ${analysisResult.loss > 0 ? 'bg-red-50 border-2 border-red-100 shadow-md shadow-red-50' : 'bg-green-50 border-2 border-green-100'}`}>
          <div className="flex items-center justify-between mb-1">
            <h4 className={`text-[9px] font-black uppercase tracking-[0.2em] ${analysisResult.loss > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {analysisResult.loss > 0 ? 'Tercih Kaynaklı Zarar' : 'Maliyet Verimliliği'}
            </h4>
            {analysisResult.loss > 0 ? <AlertTriangle className="text-red-500 w-4 h-4 animate-pulse" /> : <Check className="text-green-500 w-4 h-4" />}
          </div>
          <p className={`text-2xl font-black ${analysisResult.loss > 0 ? 'text-red-600' : 'text-green-700'}`}>
            {analysisResult.loss > 0 ? `₺${analysisResult.loss.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : 'ZARAR YOK'}
          </p>
          <p className="mt-1 text-[9px] font-bold opacity-60 italic">
            {analysisResult.loss > 0 ? 'En ucuz seçenekler yerine daha pahalı ürünler tercih edildi.' : 'Şu an en verimli alım planındasınız.'}
          </p>
        </div>
      </div>

      {/* ANA TABLO */}
      <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Fiyat Analiz Matrisi</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Sadece en ucuz teklife sahip firmalar listelenir</p>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="sticky left-0 z-10 bg-slate-100 p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-r border-slate-200">ÜRÜN / TALEP</th>
                {filteredSuppliers.map(s => (
                  <th key={s.id} className="p-6 text-center border-r border-slate-200 min-w-[220px]">
                    <div className="space-y-3">
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-tight">{s.name}</p>
                      <button 
                        onClick={() => handleOrder(s.id)}
                        className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black hover:bg-blue-700 hover:scale-105 hover:-translate-y-1 active:scale-95 transition-all duration-200 shadow-[0_4px_0_0_#1d4ed8] hover:shadow-[0_6px_0_0_#1d4ed8] active:shadow-none active:translate-y-[4px]"
                      >
                        SİPARİŞ VER
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeRequests.map(req => {
                const best = getBestPriceInfo(req.product_id);
                return (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="sticky left-0 z-10 bg-white p-6 border-r border-slate-200 group-hover:bg-slate-50">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 uppercase text-sm">{req.product?.name}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 rounded uppercase">{req.quantity} {req.product?.unit}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase italic truncate">{req.brand || 'Standart'}</span>
                        </div>
                      </div>
                    </td>
                    {filteredSuppliers.map(s => {
                      const data = priceData[req.product_id]?.[s.id];
                      const isSelected = selectedSupplierForRequest[req.id] === s.id;
                      const isBest = data && best && data.price === best.price;

                      return (
                        <td 
                          key={s.id} 
                          className={`p-3 text-center border-r border-slate-100 transition-all ${!data ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          onClick={() => data && setSelectedSupplierForRequest({...selectedSupplierForRequest, [req.id]: s.id})}
                        >
                          {data ? (
                            <div className={`
                              flex flex-col items-center justify-center p-3 h-full min-h-[80px] transition-all duration-300
                              rounded-xl border-2
                              ${isBest 
                                ? 'bg-emerald-400 border-emerald-500 text-black shadow-lg shadow-emerald-100' 
                                : isSelected 
                                  ? 'bg-red-50 border-red-200 text-red-700 shadow-inner' 
                                  : 'bg-white border-transparent hover:border-slate-200 text-slate-600'}
                            `}>
                              <span className="text-sm font-black">₺{data.price.toFixed(2)}</span>
                              
                              <div className={`
                                mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter
                                ${isBest ? 'bg-black/10 text-black' : 'bg-slate-100 text-slate-400'}
                              `}>
                                {data.type}
                              </div>

                              {isSelected && !isBest && (
                                <div className="mt-1 flex items-center text-[8px] font-black text-red-500 uppercase">
                                  <AlertTriangle className="w-2 h-2 mr-0.5" />
                                  ZARAR: ₺{(data.price - (best?.price || 0)).toFixed(2)}
                                </div>
                              )}
                              
                              {isSelected && isBest && (
                                <div className="mt-1 w-1 h-1 rounded-full bg-black"></div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full min-h-[80px] opacity-20 grayscale">
                              <span className="text-[10px] font-black text-slate-400 uppercase">VERİ YOK</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            {/* SÜTUN TOPLAMLARI (GENEL TUTAR) */}
            <tfoot className="bg-slate-900 text-white">
              <tr>
                <td className="sticky left-0 z-10 bg-slate-900 p-6 font-black text-[10px] uppercase tracking-[0.2em] border-r border-slate-800 text-slate-400">SEÇİLEN TOPLAM</td>
                {filteredSuppliers.map(s => {
                  const supplierTotal = activeRequests.reduce((sum, req) => {
                    if (selectedSupplierForRequest[req.id] === s.id) {
                      return sum + ((priceData[req.product_id]?.[s.id]?.price || 0) * req.quantity);
                    }
                    return sum;
                  }, 0);

                  return (
                    <td key={s.id} className="p-6 text-center border-r border-slate-800">
                      <p className="text-xs font-black text-blue-400 mb-1 tracking-widest uppercase">Firma Toplam</p>
                      <p className="text-lg font-black tracking-tighter">₺{supplierTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
        {activeRequests.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
            <Package className="w-16 h-16 text-slate-100" />
            <p className="text-slate-400 font-medium italic">Şu an analiz edilecek bekleyen talep bulunmuyor.</p>
          </div>
        )}
      </section>

      {/* SİPARİŞ NOTU MODAL */}
      {copyNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200"><ShoppingCart className="w-8 h-8" /></div>
              <div>
                <h4 className="text-2xl font-black text-slate-800 tracking-tight">Sipariş Notu Hazır!</h4>
                <p className="text-slate-400 font-bold text-sm">Aşağıdaki notu kopyalayıp firmaya iletin.</p>
              </div>
            </div>
            <pre className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold text-slate-700 whitespace-pre-wrap max-h-[300px] overflow-y-auto mb-8 custom-scrollbar">
              {copyNote}
            </pre>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(copyNote);
                  alert('Kopyalandı!');
                }}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center space-x-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
              >
                <Copy className="w-5 h-5" />
                <span>KOPYALA</span>
              </button>
              <button 
                onClick={() => setCopyNote(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                KAPAT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceAnalysis;
