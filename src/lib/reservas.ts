import {
  collection, addDoc, updateDoc, doc,
  query, where, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type ReservaStatus =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'llegó'
  | 'no_show';

export interface Reserva {
  id: string;
  nombre: string;
  telefono: string;
  fecha: string;   // YYYY-MM-DD
  hora: string;    // HH:MM
  personas: number;
  notas: string;
  status: ReservaStatus;
  creadoEn: { toMillis(): number } | null;
  fuente: string;
}

export async function crearReserva(
  data: Pick<Reserva, 'nombre' | 'telefono' | 'fecha' | 'hora' | 'personas' | 'notas'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'fermata_reservas'), {
    ...data,
    status: 'pendiente',
    creadoEn: serverTimestamp(),
    fuente: 'app',
  });
  return ref.id;
}

export async function actualizarStatus(
  reservaId: string,
  status: ReservaStatus,
): Promise<void> {
  await updateDoc(doc(db, 'fermata_reservas', reservaId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeByFecha(
  fecha: string,
  cb: (reservas: Reserva[]) => void,
): () => void {
  const q = query(
    collection(db, 'fermata_reservas'),
    where('fecha', '==', fecha),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reserva));
    list.sort((a, b) => a.hora.localeCompare(b.hora));
    cb(list);
  });
}
