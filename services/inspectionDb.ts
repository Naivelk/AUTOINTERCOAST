import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SavedInspection } from '../types';

interface InspectionDB extends DBSchema {
  inspections: {
    key: string; // inspection id
    value: SavedInspection;
  };
}

let dbPromise: Promise<IDBPDatabase<InspectionDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<InspectionDB>('autoinspect-db', 1, {
      upgrade(db) {
        db.createObjectStore('inspections', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function getAllInspections(): Promise<SavedInspection[]> {
  const db = await getDb();
  return await db.getAll('inspections');
}

export async function getInspectionById(id: string): Promise<SavedInspection | undefined> {
  const db = await getDb();
  return await db.get('inspections', id);
}

export async function saveInspection(inspection: SavedInspection): Promise<void> {
  const db = await getDb();
  await db.put('inspections', inspection);
}

export async function deleteInspection(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('inspections', id);
}

export async function overwriteAllInspections(inspections: SavedInspection[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('inspections', 'readwrite');
  await tx.store.clear();
  for (const insp of inspections) {
    await tx.store.put(insp);
  }
  await tx.done;
}
