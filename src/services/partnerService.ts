import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { APP_ID } from '../lib/constants';
import { Partner } from '../types/schema';

export async function fetchPartners(): Promise<Partner[]> {
  try {
    const snapshot = await getDocs(collection(db, `apps/${APP_ID}/partners`));
    const partners: Partner[] = [];
    snapshot.forEach(doc => {
      partners.push({ id: doc.id, ...doc.data() } as Partner);
    });
    return partners;
  } catch (error) {
    console.error('Error fetching partners:', error);
    return [];
  }
}
