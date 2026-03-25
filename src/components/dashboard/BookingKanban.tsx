import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { BookingCard } from './BookingCard';
import { PaymentModal } from './PaymentModal';
import { subscribeToBookings, updateBookingStatus } from '../../services/bookingManagementService';
import { Booking } from '../../types/schema';
import { LayoutDashboard, Loader2 } from 'lucide-react';

export function BookingKanban() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [paymentModalData, setPaymentModalData] = useState<{ isOpen: boolean; bookingId: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeToBookings((data) => {
      setBookings(data);
      setIsInitializing(false);
    });
    return () => unsub();
  }, []);

  // Filter columns based on realtime DB snapshot
  const cols = {
    pending: bookings.filter(b => b.status === 'pending' || b.status === 'confirmed'), // Treating legacy 'confirmed' as pending
    paid: bookings.filter(b => b.status === 'paid'),
    cancelled: bookings.filter(b => b.status === 'cancelled')
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as 'pending' | 'paid' | 'cancelled';

    if (newStatus === 'paid') {
      // Step 1: Open verification modal before committing transition
      setPaymentModalData({ isOpen: true, bookingId: draggableId });
    } else {
      // Direct state mutation
      try {
        await updateBookingStatus(draggableId, newStatus);
      } catch (err) {
        console.error(err);
        alert("Statusänderung fehlgeschlagen. Überprüfen Sie Ihre Rechte.");
      }
    }
  };

  const handlePaymentConfirm = async (method: 'bar' | 'karte' | 'voucher' | 'rechnung') => {
    if (!paymentModalData) return;
    try {
      await updateBookingStatus(paymentModalData.bookingId, 'paid', method);
      setPaymentModalData(null);
    } catch (err) {
      console.error(err);
      alert("Schwerer Fehler bei der Festschreibung der Zahlungsmetadaten.");
    }
  };

  const renderColumn = (id: string, title: string, items: Booking[]) => (
    <div className="flex flex-col flex-1 bg-gray-100 rounded-2xl overflow-hidden shadow-sm border border-gray-200 border-t-0 border-x-0 h-full">
      <div className="p-5 border-b-2 border-brand-sidebar bg-white flex justify-between items-center shadow-sm z-10">
        <h3 className="font-bold text-gray-900 tracking-tight">{title}</h3>
        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">{items.length}</span>
      </div>
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-4 overflow-y-auto space-y-4 transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-blue-50/50 ring-inset ring-2 ring-blue-500/10' : ''}`}
            style={{ minHeight: '600px' }}
          >
            {items.map((booking, index) => (
              <BookingCard key={booking.id} booking={booking} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );

  if (isInitializing) {
     return (
       <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
         <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
         <p className="font-medium text-lg text-gray-600">Lade Kanban Board & Echtzeit-Pipeline...</p>
       </div>
     );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-primary/10 rounded-xl shadow-inner">
             <LayoutDashboard className="w-7 h-7 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-heading text-brand-primary font-bold leading-tight">Live Kanban</h1>
            <p className="text-gray-500 text-base font-medium mt-1">Statusüberwachung, Stornierungen & Zahlungsverwaltung</p>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-210px)] overflow-hidden pb-4">
          {renderColumn('pending', 'Neu / Ausstehend', cols.pending)}
          {renderColumn('paid', 'Bezahlt / Bestätigt', cols.paid)}
          {renderColumn('cancelled', 'Storniert', cols.cancelled)}
        </div>
      </DragDropContext>

      <PaymentModal 
        isOpen={paymentModalData?.isOpen || false} 
        bookingId={paymentModalData?.bookingId || ''}
        onClose={() => setPaymentModalData(null)}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}
