import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { APP_ID } from '../../lib/constants';
import { Event, EventEnsembleMember } from '../../types/schema';
import type { Musiker } from '../../services/firebase/musikerService';
import { Save, Printer } from 'lucide-react';

interface Props {
  event: Event;
  musikerList: Musiker[];
}

export function EventMusikerAssignment({ event, musikerList }: Props) {
  const [ensemble, setEnsemble] = useState<EventEnsembleMember[]>(event.ensemble || []);
  const [isSaving, setIsSaving] = useState(false);

  // We ensure at least 5 rows are rendered, without truncating larger ensembles
  const minRows = Math.max(5, ensemble.length);
  const rows = Array.from({ length: minRows }, (_, i) => ensemble[i] || { musikerId: '', gage: 0, status: 'bestätigt', instrument: '', name: '' });

  const handleChange = (index: number, field: keyof EventEnsembleMember, value: any) => {
    const newEnsemble = [...rows];
    if (field === 'musikerId') {
      const selectedMusiker = musikerList.find(m => m.id === value);
      newEnsemble[index] = {
        ...newEnsemble[index],
        musikerId: value,
        name: selectedMusiker ? `${selectedMusiker.vorname} ${selectedMusiker.nachname}` : '',
        instrument: selectedMusiker?.instrument || newEnsemble[index].instrument || '',
      };
    } else {
      newEnsemble[index] = { ...newEnsemble[index], [field]: value };
    }
    setEnsemble(newEnsemble);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Only save valid rows
      const validEnsemble = ensemble.filter(member => member.musikerId !== '');
      await updateDoc(doc(db, `apps/${APP_ID}/events`, event.id), { ensemble: validEnsemble });
      alert('Musiker erfolgreich gespeichert!');
    } catch (err) {
      console.error(err);
      alert('Fehler beim Speichern der Musiker-Zuweisung.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-heading font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">
        Ensemble & Musiker Gagen
      </h3>
      
      <div className="space-y-3 mb-6">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="w-6 font-bold text-gray-400 text-sm">{index + 1}.</span>
            <select
              value={row.musikerId}
              onChange={(e) => handleChange(index, 'musikerId', e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-brand-primary focus:border-brand-primary bg-gray-50"
            >
              <option value="">-- Musiker wählen --</option>
              {musikerList
                .filter(m => m.art === 'Musiker' || m.id === row.musikerId)
                .map(m => (
                 <option key={m.id} value={m.id}>{m.vorname} {m.nachname} {(m.instrument) ? `(${m.instrument})` : ''}</option>
              ))}
            </select>
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
              <input 
                type="number"
                min="0"
                step="0.01"
                value={row.gage || ''}
                onChange={(e) => handleChange(index, 'gage', Number(e.target.value))}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-brand-primary focus:border-brand-primary"
              />
            </div>
            {row.musikerId ? (
              <button
                type="button"
                onClick={() => window.open(`/events/${event.id}/honorarnote/${row.musikerId}`, '_blank')}
                title="Honorarnote drucken"
                className="p-2 text-gray-400 hover:text-brand-primary transition-colors bg-gray-50 hover:bg-red-50 rounded border border-gray-200"
              >
                <Printer className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 h-9" />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white py-2.5 rounded-lg font-bold hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
      >
        <Save className="w-5 h-5" />
        {isSaving ? 'Speichert...' : 'Musiker speichern'}
      </button>
    </div>
  );
}
