
import React, { useState, useEffect } from 'react';
import { supabase, Product } from '../supabase';
import { Package, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const units = ['kg', 'gr', 'lt', 'adet', 'paket', 'kutu', 'koli', 'çuval', 'kova', 'kavanoz'];

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (!error && data) setProducts(data);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLocaleUpperCase('tr-TR').includes(name.toLocaleUpperCase('tr-TR'))
  );

  const hasMatch = name.trim() !== '' && filteredProducts.length > 0;
  const hasExactMatch = name.trim() !== '' && products.some(p => p.name.toLocaleUpperCase('tr-TR') === name.trim().toLocaleUpperCase('tr-TR'));

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    // Normalize for check
    const normalizedName = name.trim().toLocaleUpperCase('tr-TR');
    
    // Check local duplicate first (optional but faster)
    if (products.some(p => p.name.toLocaleUpperCase('tr-TR') === normalizedName)) {
      setError('Bu ürün zaten kayıtlı!');
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase.from('products').insert({
      name: normalizedName,
      unit
    });

    if (dbError) {
      if (dbError.code === '23505') setError('Bu ürün zaten sistemde mevcut!');
      else setError('Bir hata oluştu!');
    } else {
      setName('');
      fetchProducts();
    }
    setLoading(false);
  };

  const deleteProduct = (id: string) => {
  setDeleteId(id); // modal aç
};

const confirmDelete = async () => {
  if (!deleteId) return;

  setDeleteLoading(true);
  setError('');

  const { error: dbError } = await supabase.from('products').delete().eq('id', deleteId);

  setDeleteLoading(false);

  if (dbError) {
    setError('Silme işlemi sırasında hata oluştu!');
    return;
  }

  setDeleteId(null);
  fetchProducts();
};

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center space-x-2">
          <Plus className="text-blue-600" />
          <span>YENİ ÜRÜN EKLE</span>
        </h3>
        <form onSubmit={handleAddProduct} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Ürün Adı (Örn: NOHUT)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase transition-colors ${
                hasExactMatch ? 'text-red-600' : hasMatch ? 'text-blue-600' : 'text-slate-700'
              }`}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-600 appearance-none"
            >
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>KAYDET</span>
          </button>
        </form>
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center space-x-2 text-sm font-bold border border-red-100">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </section>

      <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center space-x-2 uppercase">
          <Package className="text-blue-600" />
          <span>KAYITLI ÜRÜNLER ({filteredProducts.length})</span>
        </h3>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ürün Adı</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Birim</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{product.name}</td>
                  <td className="px-6 py-4"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-tighter">{product.unit}</span></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">
                    {name ? 'Eşleşen ürün bulunamadı.' : 'Henüz ürün kaydı bulunmuyor.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {deleteId && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div
      className="absolute inset-0 bg-black/40"
      onClick={() => !deleteLoading && setDeleteId(null)}
    />
    <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
      <h3 className="text-lg font-bold text-slate-800">Ürünü Sil</h3>
      <p className="mt-2 text-sm text-slate-600">
        Bu ürünü silmek istediğinize emin misiniz?
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setDeleteId(null)}
          disabled={deleteLoading}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold disabled:opacity-50"
        >
          Vazgeç
        </button>

        <button
          onClick={confirmDelete}
          disabled={deleteLoading}
          className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-semibold disabled:opacity-50"
        >
          {deleteLoading ? 'Siliniyor...' : 'Sil'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default ProductManagement;
