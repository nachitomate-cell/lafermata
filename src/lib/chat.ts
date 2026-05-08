import {
  collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type ChatSender = 'client' | 'staff' | 'system';

export interface ChatMessage {
  id: string;
  text: string;
  sender: ChatSender;
  timestamp: Timestamp | null;
  read: boolean;
}

export const QUICK_REPLIES = [
  'Ya estamos preparando tu orden. ¡Gracias por tu paciencia!',
  'Tu pedido tomará aproximadamente 10 minutos más.',
  '¡Tu pedido está casi listo! En breve puedes pasar a retirarlo.',
  'Recuerda retirar en Av. Libertad 1040, Viña del Mar.',
  '¿Tienes alguna consulta sobre tu pedido?',
];

export const AUTO_MSG_RECIBIDO =
  '¡Hola! Hemos recibido tu pedido. Lo estamos revisando para pasarlo a cocina.';
export const AUTO_MSG_LISTO =
  '¡Tu pedido está listo! Te esperamos en el mostrador para el retiro. 🎉';

export async function sendMessage(
  orderId: string,
  text: string,
  sender: ChatSender,
): Promise<void> {
  await addDoc(collection(db, 'fermata_chats', orderId, 'messages'), {
    text,
    sender,
    timestamp: serverTimestamp(),
    read: false,
  });
}

export function subscribeChat(
  orderId: string,
  cb: (messages: ChatMessage[]) => void,
): () => void {
  const q = query(
    collection(db, 'fermata_chats', orderId, 'messages'),
    orderBy('timestamp', 'asc'),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  });
}
