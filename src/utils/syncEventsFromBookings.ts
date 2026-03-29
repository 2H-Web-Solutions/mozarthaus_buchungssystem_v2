import { collection, getDocs, doc, getDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { APP_ID } from '../lib/constants';
import { initializeEventSeats } from '../services/bookingService';

export async function syncMissingEvents() {
  try {
    const bookingsSnap = await getDocs(collection(db, `apps/${APP_ID}/bookings`));
    const uniqueEvents = new Map();

    // 1. Daten intelligent aus der eventId und dem dateTime Timestamp extrahieren
    bookingsSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.eventId && data.dateTime) {
        
        // Firestore Timestamp in JS Date umwandeln
        let dateObj;
        if (typeof data.dateTime.toDate === 'function') {
          dateObj = data.dateTime.toDate();
        } else {
          dateObj = new Date(data.dateTime);
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
          // Lokale Uhrzeit extrahieren (z.B. "18:00")
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          const timeString = `${hours}:${minutes}`;
          
          const parts = data.eventId.split('_');
          if (parts.length >= 4) {
            const slug = parts[0];
            const title = slug.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            if (!uniqueEvents.has(data.eventId)) {
              uniqueEvents.set(data.eventId, {
                title: title,
                dateObj: dateObj,
                time: timeString
              });
            }
          }
        }
      }
    });

    let createdCount = 0;
    let initializedSeatsCount = 0;
    
    // 2. Events in Batches verarbeiten
    const eventsArray = Array.from(uniqueEvents.entries());
    const chunkSize = 100;
    
    for (let i = 0; i < eventsArray.length; i += chunkSize) {
      const chunk = eventsArray.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      const seatsToInitialize = [];
      
      for (const [eventId, eventData] of chunk) {
        const eventRef = doc(db, `apps/${APP_ID}/events`, eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) {
          // Event fehlt -> Neu anlegen mit ORIGINAL Uhrzeit aus Regiondo
          const eventTimestamp = Timestamp.fromDate(eventData.dateObj);
          batch.set(eventRef, {
            title: eventData.title,
            date: eventTimestamp,
            time: eventData.time,
            status: 'active'
          });
          seatsToInitialize.push(eventId);
          createdCount++;
        } else {
          // Event existiert (z.B. manuell erstellt) -> Prüfen ob Sitze fehlen
          const seatsSnap = await getDocs(collection(db, `apps/${APP_ID}/events/${eventId}/seats`));
          if (seatsSnap.empty) {
            seatsToInitialize.push(eventId);
            initializedSeatsCount++;
          }
        }
      }
      
      await batch.commit();
      
      // 3. Sitze initialisieren
      for (const eventId of seatsToInitialize) {
        await initializeEventSeats(eventId);
      }
    }

    return { createdCount, initializedSeatsCount };
  } catch (error) {
    console.error("Fehler beim Synchronisieren:", error);
    throw error;
  }
}
