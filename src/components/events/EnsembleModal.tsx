import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { APP_ID } from '../../lib/constants';
import { Event, EventEnsembleMember } from '../../types/schema';
import type { Musiker } from '../../services/firebase/musikerService';
import { X, Search, Plus, Trash2, Save, UserCheck, Music } from 'lucide-react';

interface EnsembleModalProps {
  event: Event;
  onClose: () => void;
}

export function EnsembleModal({ event, onClose }: EnsembleModalProps) {
  const [musikerList, setMusikerList] = useState<Musiker[]>([]);
  const [ensemble, setEnsemble] = useState<EventEnsembleMember[]>(event.ensemble || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Musiker' | 'Mitarbeiter'>('Musiker');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, `apps/${APP_ID}/musiker`), snap => {
      const list: Musiker[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Musiker));
      list.sort((a, b) => a.nachname.localeCompare(b.nachname));
      setMusikerList(list);
    });
    return () => unsub();
  }, []);

  const handleAdd = (m: Musiker) => {
    if (ensemble.some(e => e.musikerId === m.id)) return;
    setEnsemble([...ensemble, {
      musikerId: m.id,
      name: `${m.vorname} ${m.nachname}`,
      instrument: m.instrument || '',
      status: 'angefragt'
    }]);
  };

  const handleRemove = (id: string) => {
    if (window.confirm('Musiker aus dem Ensemble entfernen?')) {
      setEnsemble(ensemble.filter(e => e.musikerId !== id));
    }
  };

  const handleUpdateMember = (id: string, updates: Partial<EventEnsembleMember>) => {
    setEnsemble(ensemble.map(e => e.musikerId === id ? { ...e, ...updates } : e));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const eventRef = doc(db, `apps/${APP_ID}/events`, event.id);
      await updateDoc(eventRef, { ensemble });
      onClose();
    } catch (error) {
      console.error('Error saving ensemble:', error);
      alert('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredByType = musikerList.filter(m => {
    if (activeTab === 'Musiker') return m.art === 'Musiker';
    if (activeTab === 'Mitarbeiter') return m.art === 'Mitarbeiter' || m.art === 'Dienstleister';
    return false;
  });

  const availableMusiker = filteredByType.filter(m => 
    !ensemble.some(e => e.musikerId === m.id) &&
    (`${m.vorname} ${m.nachname} ${m.instrument || ''} ${m.art || ''}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Zuweisungen aufteilen für die linke Spalte
  const getAssignedProps = (id: string) => musikerList.find(m => m.id === id);
  const assignedMusiker = ensemble.filter(e => {
    const p = getAssignedProps(e.musikerId);
    return !p || p.art === 'Musiker'; // Fallback to Musiker if not loaded yet
  });
  const assignedMitarbeiter = ensemble.filter(e => {
    const p = getAssignedProps(e.musikerId);
    return p && (p.art === 'Mitarbeiter' || p.art === 'Dienstleister');
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">
              <Music className="w-6 h-6 text-brand-primary" />
              Ensemble & Dienstplan
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Event: <span className="text-brand-primary">{event.title}</span> • 
              Datum: {typeof event.date !== 'string' && (event.date as any)?.toDate ? (event.date as any).toDate().toLocaleDateString('de-AT') : String(event.date)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-gray-50/30">
          
          {/* Left Side: Current Ensemble */}
          <div className="flex-1 border-r border-gray-200 flex flex-col min-h-0 bg-white shadow-sm z-10">
            <div className="p-5 border-b border-gray-100 bg-gray-50/80">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                Zugewiesenes Personal ({ensemble.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {ensemble.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                  <p className="text-gray-400 font-medium">Bisher keine Musiker zugewiesen.</p>
                  <p className="text-sm text-gray-400 mt-1">Wählen Sie Musiker aus der rechten Liste aus.</p>
                </div>
              ) : (
                <>
                  {/* Block 1: Zugewiesene Musiker */}
                  {assignedMusiker.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-100 pb-2">Musiker ({assignedMusiker.length})</h4>
                      <div className="space-y-3">
                        {assignedMusiker.map((member) => (
                          <div key={member.musikerId} className="bg-white border text-sm border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                            <button 
                              onClick={() => handleRemove(member.musikerId)}
                              className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Entfernen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            
                            <div className="font-bold text-gray-900 text-base mb-3 pr-8">{member.name}</div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Rolle / Instrument</label>
                                <input 
                                  type="text" 
                                  value={member.instrument}
                                  onChange={(e) => handleUpdateMember(member.musikerId, { instrument: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-gray-50 focus:bg-white transition-colors"
                                  placeholder="z.B. 1. Violine"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Status</label>
                                <select
                                  value={member.status}
                                  onChange={(e) => handleUpdateMember(member.musikerId, { status: e.target.value as any })}
                                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg font-medium focus:ring-2 transition-colors ${
                                    member.status === 'bestätigt' ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500/20 focus:border-green-500' : 
                                    member.status === 'abgesagt' ? 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500/20 focus:border-red-500' : 
                                    'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500/20 focus:border-yellow-500'
                                  }`}
                                >
                                  <option value="angefragt">Angefragt</option>
                                  <option value="bestätigt">Bestätigt</option>
                                  <option value="abgesagt">Abgesagt</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Block 2: Zugewiesene Mitarbeiter/Dienstleister */}
                  {assignedMitarbeiter.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-100 pb-2">Mitarbeiter & Dienstleister ({assignedMitarbeiter.length})</h4>
                      <div className="space-y-3">
                        {assignedMitarbeiter.map((member) => (
                          <div key={member.musikerId} className="bg-white border text-sm border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                            <button 
                              onClick={() => handleRemove(member.musikerId)}
                              className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Entfernen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            
                            <div className="font-bold text-gray-900 text-base mb-3 pr-8">{member.name}</div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Rolle / Position</label>
                                <input 
                                  type="text" 
                                  value={member.instrument}
                                  onChange={(e) => handleUpdateMember(member.musikerId, { instrument: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-gray-50 focus:bg-white transition-colors"
                                  placeholder="z.B. Garderobe, Techniker"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Status</label>
                                <select
                                  value={member.status}
                                  onChange={(e) => handleUpdateMember(member.musikerId, { status: e.target.value as any })}
                                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg font-medium focus:ring-2 transition-colors ${
                                    member.status === 'bestätigt' ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500/20 focus:border-green-500' : 
                                    member.status === 'abgesagt' ? 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500/20 focus:border-red-500' : 
                                    'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500/20 focus:border-yellow-500'
                                  }`}
                                >
                                  <option value="angefragt">Angefragt</option>
                                  <option value="bestätigt">Bestätigt</option>
                                  <option value="abgesagt">Abgesagt</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Side: Available Musiker */}
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="p-5 border-b border-gray-100 bg-gray-50/80">
              <h3 className="font-bold text-gray-800 mb-4">Verfügbare {activeTab}</h3>

              {/* Tabs */}
              <div className="flex space-x-4 mb-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('Musiker')}
                  className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
                    activeTab === 'Musiker' 
                      ? 'border-brand-primary text-brand-primary font-bold' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Musiker
                </button>
                <button
                  onClick={() => setActiveTab('Mitarbeiter')}
                  className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
                    activeTab === 'Mitarbeiter' 
                      ? 'border-brand-primary text-brand-primary font-bold' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Mitarbeiter
                </button>
              </div>

              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Suchen nach Name, Instrument, Typ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white shadow-sm text-sm"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {availableMusiker.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">Keine weiteren Musiker gefunden.</div>
              ) : (
                availableMusiker.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-colors group bg-white">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{m.vorname} {m.nachname}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex gap-2 items-center">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">{m.art}</span>
                        {m.instrument && <span>• {m.instrument}</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAdd(m)}
                      className="p-2 text-brand-primary hover:bg-brand-primary hover:text-white border border-brand-primary/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Hinzufügen"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
          >
            Abbrechen
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 disabled:opacity-70 transition-all shadow-md shadow-brand-primary/20"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Speichert...' : 'Dienstplan speichern'}
          </button>
        </div>

      </div>
    </div>
  );
}
