import React, { useState } from 'react';
import { doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { APP_ID } from '../lib/constants';
import { initializeEventSeats } from '../services/bookingService';
import { CalendarDays, Loader2 } from 'lucide-react';

export function BulkEventGenerator({ onComplete }: { onComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [title, setTitle] = useState('Mozart Ensemble');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [days, setDays] = useState({
    1: false, // Mo
    2: true,  // Di
    3: false, // Mi
    4: true,  // Do
    5: false, // Fr
    6: true,  // Sa
    0: true   // So
  });

  const toggleDay = (day: number) => setDays(prev => ({ ...prev, [day]: !prev[day as keyof typeof prev] }));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !title) return;
    
    setIsGenerating(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let currentDate = new Date(start);
      
      const eventsToCreate = [];

      while (currentDate <= end) {
        if (days[currentDate.getDay() as keyof typeof days]) {
          // Lokales Datum sicher extrahieren, um Zeitzonen-Shifts zu vermeiden
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          
          const dateStrForId = dateString.replace(/-/g, '_');
          const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          const eventId = `${titleSlug}_${dateStrForId}`;
          
          // Kombiniere lokales Datum und Uhrzeit für den Timestamp
          const dateTimeString = `${dateString}T${time}:00`;
          const eventTimestamp = Timestamp.fromDate(new Date(dateTimeString));

          eventsToCreate.push({
            id: eventId,
            title,
            date: eventTimestamp,
            time: time,
            status: 'active'
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (!window.confirm(`${eventsToCreate.length} Events werden generiert. Fortfahren?`)) {
        setIsGenerating(false);
        return;
      }

      // Firestore Batches können max 500 Operationen. Wir machen Chunks à 100 Events.
      const chunkSize = 100;
      for (let i = 0; i < eventsToCreate.length; i += chunkSize) {
        const chunk = eventsToCreate.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        for (const evt of chunk) {
          const ref = doc(db, `apps/${APP_ID}/events`, evt.id);
          batch.set(ref, {
            title: evt.title,
            date: evt.date,
            time: evt.time,
            status: evt.status
          });
        }
        await batch.commit();
        
        // Sitze für jedes Event im Chunk initialisieren
        for (const evt of chunk) {
          await initializeEventSeats(evt.id);
        }
      }

      alert(`${eventsToCreate.length} Events erfolgreich generiert!`);
      setIsOpen(false);
      onComplete();
    } catch (error) {
      console.error(error);
      alert('Fehler bei der Generierung.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
      >
        <CalendarDays className="w-5 h-5"/> Serientermine generieren
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-heading text-brand-primary mb-4">Serientermine generieren</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Event Titel</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Startdatum</label>
              <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Enddatum</label>
              <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Uhrzeit</label>
            <input required type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Wochentage</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 1, label: 'Mo' }, { id: 2, label: 'Di' }, { id: 3, label: 'Mi' },
                { id: 4, label: 'Do' }, { id: 5, label: 'Fr' }, { id: 6, label: 'Sa' }, { id: 0, label: 'So' }
              ].map(day => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${days[day.id as keyof typeof days] ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Abbrechen</button>
            <button disabled={isGenerating} type="submit" className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded hover:bg-red-700 disabled:opacity-50">
              {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isGenerating ? 'Generiere...' : 'Events erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
