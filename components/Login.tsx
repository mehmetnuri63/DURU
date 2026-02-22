
import React, { useState } from 'react';
import { ChefHat, Lock } from 'lucide-react';
import { UserRole } from '../App';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePinChange = (val: string) => {
    if (val.length <= 6) {
      setPin(val);
      if (val.length === 6) {
        // Simple logic for simulation:
        // 111111 -> SATINALMA
        // 222222 -> MUTFAK
        if (val === '111111') {
          onLogin('SATINALMA');
        } else if (val === '222222') {
          onLogin('MUTFAK');
        } else {
          setError('Hatalı PIN Kodu!');
          setTimeout(() => {
            setPin('');
            setError('');
          }, 1000);
        }
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-2xl flex flex-col items-center">
        <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 mb-6">
          <ChefHat className="text-white w-14 h-14" />
        </div>
        
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">DURU</h1>
        <p className="text-blue-200 font-medium mb-12 tracking-wide uppercase text-sm">Akıllı Yönetim Sistemi</p>

        <div className="w-full space-y-6">
          <div className="text-center">
            <p className="text-white/60 text-xs font-bold uppercase mb-4">Lütfen 6 Haneli PIN Giriniz</p>
            <div className="flex justify-center space-x-3 mb-8">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                    pin.length > i ? 'bg-blue-500 border-blue-500 scale-125' : 'border-white/30'
                  }`}
                />
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'DEL', 0, 'OK'].map((key) => (
                <button
                  key={key.toString()}
                  onClick={() => {
                    if (key === 'DEL') setPin(pin.slice(0, -1));
                    else if (key === 'OK') {} 
                    else handlePinChange(pin + key);
                  }}
                  className="h-16 rounded-2xl bg-white/5 hover:bg-white/20 text-white font-bold text-xl transition-all active:scale-95 border border-white/10"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          
          {error && (
            <p className="text-red-400 text-center font-bold text-sm animate-bounce">{error}</p>
          )}

          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
              Admin: 111111 | Mutfak: 222222
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
