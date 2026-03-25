import { Draggable } from '@hello-pangea/dnd';
import { Booking } from '../../types/schema';
import { Copy, Calendar, User, Ticket } from 'lucide-react';

export function BookingCard({ booking, index }: { booking: Booking; index: number }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(booking.id);
  };
  
  const totalTickets = booking.tickets 
    ? booking.tickets.reduce((acc, t) => acc + t.quantity, 0) 
    : booking.seatIds?.length || 0;

  return (
    <Draggable draggableId={booking.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-4 bg-white rounded-xl shadow-sm border ${snapshot.isDragging ? 'border-brand-primary ring-2 ring-brand-primary/20 scale-[1.02] shadow-xl' : 'border-gray-200 hover:border-gray-300'} transition-all cursor-grab active:cursor-grabbing`}
        >
          <div className="flex justify-between items-start mb-3">
            <button 
              onClick={handleCopy} 
              className="text-xs font-mono text-gray-500 hover:text-brand-primary disabled:opacity-50 flex items-center gap-1.5 bg-gray-50 hover:bg-red-50 px-2 py-1 rounded transition-colors group"
            >
              <span className="truncate w-[100px]" title={booking.id}>{booking.id}</span>
              <Copy className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </button>
            
            <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold ${
              booking.status === 'paid' ? 'bg-green-100 text-green-700' : 
              booking.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : 
              'bg-blue-100 text-blue-700'
            }`}>
              {booking.status === 'paid' && booking.paymentMethod ? booking.paymentMethod : '€ ' + booking.totalAmount.toFixed(2)}
            </span>
          </div>

          <p className="font-bold text-gray-900 flex items-center gap-2 mb-1 text-sm tracking-tight" title={booking.customerData.name}>
            <User className="w-4 h-4 text-brand-primary shrink-0" />
            <span className="truncate">{booking.source === 'b2b' && booking.partnerId ? `B2B: ${booking.partnerId}` : booking.customerData.name}</span>
          </p>

          <p className="text-xs text-gray-500 flex items-center gap-2 mb-4 font-medium" title={booking.eventId}>
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{booking.variantId ? `${booking.variantId} • ${booking.eventId}` : booking.eventId}</span>
          </p>

          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded">
              <Ticket className="w-3.5 h-3.5 text-gray-500" />
              {totalTickets} Ticket(s)
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
