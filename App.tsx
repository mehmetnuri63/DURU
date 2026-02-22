
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  ClipboardList, 
  TrendingDown, 
  Tag, 
  LogOut, 
  ChefHat,
  Search,
  Bell,
  CheckCircle2,
  Package,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  Edit2,
  Star
} from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProductManagement from './components/ProductManagement';
import SupplierManagement from './components/SupplierManagement';
import RequestPanel from './components/RequestPanel';
import PriceAnalysis from './components/PriceAnalysis';
import PriceOffers from './components/PriceOffers';

export type UserRole = 'SATINALMA' | 'MUTFAK';

const App: React.FC = () => {
  const [user, setUser] = useState<{ role: UserRole } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const handleLogin = (role: UserRole) => {
    setUser({ role });
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'ANA PANEL', icon: <LayoutDashboard className="w-6 h-6" />, roles: ['SATINALMA', 'MUTFAK'] },
    { id: 'products', label: 'ÜRÜN EKLE', icon: <PlusCircle className="w-6 h-6" />, roles: ['SATINALMA', 'MUTFAK'] },
    { id: 'suppliers', label: 'TEDARİKÇİ EKLE', icon: <Users className="w-6 h-6" />, roles: ['SATINALMA', 'MUTFAK'] },
    { id: 'requests', label: 'TALEP EKRANI', icon: <ClipboardList className="w-6 h-6" />, roles: ['SATINALMA', 'MUTFAK'] },
    { id: 'analysis', label: 'FİYAT ÖNERİ', icon: <TrendingDown className="w-6 h-6" />, roles: ['SATINALMA'] },
    { id: 'offers', label: 'FİYAT TEKLİFLERİ', icon: <Tag className="w-6 h-6" />, roles: ['SATINALMA'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
        <div className="p-8 flex flex-col items-center border-b border-slate-100">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4">
            <ChefHat className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-800">DURU <span className="text-blue-600">ERP</span></h1>
          <p className="text-xs text-slate-400 font-bold mt-1 tracking-widest uppercase">{user.role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-x-1'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className={activeTab === item.id ? 'text-white' : 'text-blue-500 opacity-70'}>
                {item.icon}
              </span>
              <span className="font-bold text-sm tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>ÇIKIŞ YAP</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* Header */}
        <header className="sticky top-0 z-10 glass border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-slate-600 uppercase">SİSTEM ÇEVRİMİÇİ</span>
            </div>
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && <Dashboard userRole={user.role} />}
          {activeTab === 'products' && <ProductManagement />}
          {activeTab === 'suppliers' && <SupplierManagement />}
          {activeTab === 'requests' && <RequestPanel userRole={user.role} />}
          {activeTab === 'analysis' && <PriceAnalysis />}
          {activeTab === 'offers' && <PriceOffers />}
        </div>
      </main>
    </div>
  );
};

export default App;
