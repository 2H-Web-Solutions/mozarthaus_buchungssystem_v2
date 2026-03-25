import { useState } from 'react';
import { X, CreditCard, Banknote, Ticket, FileText } from 'lucide-react';

interface PaymentModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: 'bar' | 'karte' | 'voucher' | 'rechnung') => void;
}

export function PaymentModal({ bookingId, isOpen, onClose, onConfirm }: PaymentModalProps) {
  const [method, setMethod] = useState<'bar' | 'karte' | 'voucher' | 'rechnung'>('bar');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 mx-4">
        
        <button onClick={onClose} className="absolute right-5 top-5 text-gray-400 hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full">
          <X className="w-5 h-5"/>
        </button>
        
        <h2 className="text-2xl font-heading font-bold mb-1 text-gray-900">Überweisung bestätigen</h2>
        <p className="text-sm font-mono text-gray-500 mb-8 bg-gray-100 p-2 rounded truncate">ID: {bookingId}</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Cash */}
          <button onClick={() => setMethod('bar')} className={`p-5 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${method === 'bar' ? 'border-brand-primary bg-red-50 text-brand-primary shadow-inner scale-[1.02]' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}>
            <Banknote className="w-8 h-8"/> 
            <span className="font-bold">Barzahlung</span>
          </button>
          
          {/* Card */}
          <button onClick={() => setMethod('karte')} className={`p-5 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${method === 'karte' ? 'border-brand-primary bg-red-50 text-brand-primary shadow-inner scale-[1.02]' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}>
            <CreditCard className="w-8 h-8"/> 
            <span className="font-bold">Kartenzahlung</span>
          </button>

          {/* Voucher */}
          <button onClick={() => setMethod('voucher')} className={`p-5 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${method === 'voucher' ? 'border-brand-primary bg-red-50 text-brand-primary shadow-inner scale-[1.02]' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}>
            <Ticket className="w-8 h-8"/> 
            <span className="font-bold text-sm text-center">Gutschein / Regiondo</span>
          </button>

          {/* Invoice */}
          <button onClick={() => setMethod('rechnung')} className={`p-5 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${method === 'rechnung' ? 'border-brand-primary bg-red-50 text-brand-primary shadow-inner scale-[1.02]' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}>
            <FileText className="w-8 h-8"/> 
            <span className="font-bold">Rechnung (B2B)</span>
          </button>
        </div>

        <div className="flex gap-4">
          <button onClick={onClose} className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
            Abbrechen
          </button>
          <button onClick={() => onConfirm(method)} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-brand-primary/20">
            Buchung "Bezahlt"
          </button>
        </div>
      </div>
    </div>
  );
}
