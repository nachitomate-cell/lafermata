import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, limit, onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

export type PedidoStatus =
  | 'pending'
  | 'nuevo'
  | 'en_preparacion'
  | 'en_horno'
  | 'lista'
  | 'entregado';

export interface PedidoItem {
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface Pedido {
  id: string;
  buyOrder: string;
  items: PedidoItem[];
  amount: number;
  status: PedidoStatus;
  authCode?: string;
  clientUid?: string;
  clientName?: string;
  paymentMethod?: 'webpay' | 'efectivo';
  creadoEn: string;
  actualizadoEn?: string;
  confirmedAt?: string;
}

export async function crearPedidoPendiente(
  buyOrder: string,
  items: PedidoItem[],
  amount: number,
  clientUid?: string,
): Promise<void> {
  await addDoc(collection(db, 'fermata_pedidos'), {
    buyOrder,
    items,
    amount,
    status: 'pending',
    clientUid: clientUid ?? '',
    paymentMethod: 'webpay',
    creadoEn: new Date().toISOString(),
  });
}

export async function crearPedidoDirecto(
  buyOrder: string,
  items: PedidoItem[],
  amount: number,
  clientUid: string,
  clientName?: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'fermata_pedidos'), {
    buyOrder,
    items,
    amount,
    status: 'nuevo',
    clientUid,
    clientName: clientName?.trim() ?? '',
    paymentMethod: 'efectivo',
    creadoEn: new Date().toISOString(),
  });
  return ref.id;
}

export async function confirmarPedido(buyOrder: string, authCode: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, 'fermata_pedidos'), where('buyOrder', '==', buyOrder), limit(1)),
  );
  if (snap.empty) return;
  const ref = snap.docs[0].ref;
  if (snap.docs[0].data().status === 'pending') {
    await updateDoc(ref, {
      status: 'en_preparacion',
      authCode,
      confirmedAt: new Date().toISOString(),
    });
  }
}

export async function actualizarStatusPedido(
  pedidoId: string,
  status: PedidoStatus,
): Promise<void> {
  await updateDoc(doc(db, 'fermata_pedidos', pedidoId), {
    status,
    actualizadoEn: new Date().toISOString(),
  });
}

export function subscribePedidoByOrder(
  buyOrder: string,
  cb: (pedido: Pedido | null) => void,
): () => void {
  const q = query(
    collection(db, 'fermata_pedidos'),
    where('buyOrder', '==', buyOrder),
    limit(1),
  );
  return onSnapshot(q, snap => {
    cb(snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Pedido));
  });
}

export function subscribeKitchen(cb: (pedidos: Pedido[]) => void): () => void {
  const q = query(
    collection(db, 'fermata_pedidos'),
    where('status', 'in', ['en_preparacion', 'en_horno', 'lista']),
  );
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pedido));
    list.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
    cb(list);
  });
}

export function subscribeOrders(cb: (pedidos: Pedido[]) => void): () => void {
  const q = query(
    collection(db, 'fermata_pedidos'),
    where('status', 'in', ['nuevo', 'en_preparacion', 'en_horno', 'lista']),
  );
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pedido));
    list.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
    cb(list);
  });
}
