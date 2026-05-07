/**
 * La Fermata Club – Loyalty Engine
 *
 * Flujo principal (Handshake Digital):
 *   1. Cliente abre /club/scan → escanea QR del local
 *   2. Se crea un pending_stamp en Firestore (status:"pending")
 *   3. Staff ve la solicitud en /club/staff → confirma o rechaza
 *   4. Si confirma → sello acreditado atómicamente
 *   5. Cliente recibe notificación en tiempo real
 */

import {
  doc, getDoc, setDoc, updateDoc, increment,
  collection, addDoc, runTransaction, serverTimestamp,
  deleteDoc, query, where, getDocs, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ──────────────────────────────────────────────────────────────────────────────

export const FERMATA_VENDOR_ID = "lafermata_viña_del_mar";
export const FERMATA_VENDOR_NAME = "La Fermata – Viña del Mar";
export const STAMPS_PER_REWARD = 5;         // cada 5 sellos → recompensa disponible
export const WELCOME_STAMPS = 1;            // sello de bienvenida al registrarse

export const TIERS = [
  { name: "Visitante",       min: 0,   color: "#7a7468", emoji: "🌱" },
  { name: "Habitué",         min: 5,   color: "#c9a84c", emoji: "⭐" },
  { name: "Pizzaiolo",       min: 15,  color: "#e8411a", emoji: "🔥" },
  { name: "Maestro",         min: 30,  color: "#a855f7", emoji: "👑" },
];

export function getTier(totalHistorico: number) {
  return [...TIERS].reverse().find(t => totalHistorico >= t.min) ?? TIERS[0];
}

// ──────────────────────────────────────────────────────────────────────────────
// TIPOS
// ──────────────────────────────────────────────────────────────────────────────

export interface UserClubData {
  nombre: string;
  correo: string;
  telefono?: string;
  fechaNacimiento?: string;
  sellos: number;               // sellos actuales (se descontam al canjear)
  totalSellosHistoricos: number; // nunca baja, determina tier
  recompensaDisponible: boolean;
  totalCanjesHistoricos: number;
  baneado: boolean;
  createdAt: string;
  rol: "cliente" | "staff";
  flavorProfile?: Partial<Record<"pomodoro"|"crema"|"pesto"|"mar"|"fungi"|"carne"|"dolce", number>>;
}

export interface Premio {
  id: string;
  nombre: string;
  descripcion: string;
  sellosRequeridos: number;
  icono: string;
  activo: boolean;
  stock?: number;
}

export interface Canje {
  id: string;
  clienteId: string;
  clienteNombre: string;
  premioId: string;
  premioNombre: string;
  premioIcono: string;
  sellosDescontados: number;
  codigo: string;
  status: "pending" | "used" | "expired";
  creadoEn: any;
  expiraEn: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// REGISTRO DE USUARIO
// ──────────────────────────────────────────────────────────────────────────────

export async function registrarNuevoMiembro(
  userId: string,
  nombre: string,
  correo: string,
  telefono?: string,
  fechaNacimiento?: string
): Promise<void> {
  const userRef = doc(db, "fermata_usuarios", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) return; // ya registrado

  const timestamp = new Date().toISOString();
  await setDoc(userRef, {
    nombre,
    correo,
    telefono: telefono || undefined,
    fechaNacimiento: fechaNacimiento || undefined,
    sellos: WELCOME_STAMPS,
    totalSellosHistoricos: WELCOME_STAMPS,
    recompensaDisponible: WELCOME_STAMPS >= STAMPS_PER_REWARD,
    totalCanjesHistoricos: 0,
    baneado: false,
    createdAt: timestamp,
    rol: "cliente",
  } satisfies Omit<UserClubData, "id">);

  // Log de bienvenida
  await addDoc(collection(db, "fermata_logs"), {
    usuarioId: userId,
    usuarioNombre: nombre,
    accion: `Se unió al club y recibió ${WELCOME_STAMPS} sello de bienvenida`,
    fecha: timestamp,
    tipo: "BIENVENIDA",
  }).catch(() => {});
}

// ──────────────────────────────────────────────────────────────────────────────
// HANDSHAKE DIGITAL
// ──────────────────────────────────────────────────────────────────────────────

/** El cliente crea una solicitud de sello mostrando su QR al staff. */
export async function crearPendingStamp(
  userId: string,
  userName: string
): Promise<string> {
  const userRef = doc(db, "fermata_usuarios", userId);
  const snap = await getDoc(userRef);
  if (snap.exists() && snap.data().baneado) throw new Error("Usuario baneado.");

  const pendingRef = await addDoc(collection(db, "fermata_pending_stamps"), {
    userId,
    userName: userName || "Miembro del Club",
    vendorId: FERMATA_VENDOR_ID,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  return pendingRef.id;
}

/** El staff confirma el sello (transacción atómica). */
export async function confirmarHandshake(
  pendingId: string
): Promise<{ userId: string; userName: string; nuevoTotal: number }> {
  const pendingRef = doc(db, "fermata_pending_stamps", pendingId);

  const result = await runTransaction(db, async (transaction) => {
    const pendingSnap = await transaction.get(pendingRef);
    if (!pendingSnap.exists()) throw new Error("Solicitud no encontrada.");

    const pending = pendingSnap.data();
    if (pending.status !== "pending") {
      throw new Error(pending.status === "expired" ? "La solicitud expiró." : "Ya fue procesada.");
    }

    // Expiración: 5 minutos
    const createdAt: Date = pending.createdAt?.toDate?.() ?? new Date(0);
    if ((Date.now() - createdAt.getTime()) / 60000 > 5) {
      transaction.update(pendingRef, { status: "expired" });
      throw new Error("La solicitud expiró (más de 5 minutos).");
    }

    const { userId, userName } = pending;
    const userRef = doc(db, "fermata_usuarios", userId);
    const userSnap = await transaction.get(userRef);

    const timestamp = new Date().toISOString();
    const currentSellos = userSnap.exists() ? (userSnap.data().sellos || 0) : 0;
    const nuevoTotal = currentSellos + 1;
    const totalHistorico = userSnap.exists() ? (userSnap.data().totalSellosHistoricos || 0) + 1 : 1;
    const realName = (userSnap.exists() ? userSnap.data().nombre : null) || userName || "Miembro";

    transaction.update(pendingRef, {
      status: "confirmed",
      nuevoTotal,
      confirmedAt: serverTimestamp(),
    });

    if (userSnap.exists()) {
      transaction.update(userRef, {
        sellos: increment(1),
        totalSellosHistoricos: increment(1),
        recompensaDisponible: nuevoTotal >= STAMPS_PER_REWARD,
        lastPurchaseAt: timestamp,
      });
    } else {
      transaction.set(userRef, {
        nombre: realName,
        correo: "",
        sellos: 1,
        totalSellosHistoricos: 1,
        recompensaDisponible: false,
        totalCanjesHistoricos: 0,
        baneado: false,
        createdAt: timestamp,
        rol: "cliente",
      });
    }

    return { userId, userName: realName, nuevoTotal, totalHistorico };
  });

  // Logs no críticos
  addDoc(collection(db, "fermata_logs"), {
    usuarioId: result.userId,
    usuarioNombre: result.userName,
    accion: `Sello acreditado (handshake) — total: ${result.nuevoTotal}`,
    fecha: new Date().toISOString(),
    tipo: "SELLO",
    metodo: "HANDSHAKE",
  }).catch(() => {});

  return result;
}

/** El staff rechaza la solicitud. */
export async function rechazarHandshake(pendingId: string): Promise<void> {
  await updateDoc(doc(db, "fermata_pending_stamps", pendingId), { status: "rejected" });
}

/** El cliente cancela su solicitud pendiente. */
export async function cancelarPendingStamp(pendingId: string): Promise<void> {
  await deleteDoc(doc(db, "fermata_pending_stamps", pendingId));
}

// ──────────────────────────────────────────────────────────────────────────────
// CANJE DE PREMIOS
// ──────────────────────────────────────────────────────────────────────────────

function generarCodigo(premioNombre: string): string {
  const prefix = premioNombre.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `LF-${prefix}${ts}${rnd}`;
}

export async function canjearPremio(
  userId: string,
  userName: string,
  premio: Premio
): Promise<{ canjeId: string; codigo: string }> {
  const codigo = generarCodigo(premio.nombre);
  const expiraEn = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const userRef = doc(db, "fermata_usuarios", userId);

  const canjeId = await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error("Usuario no encontrado.");

    const data = userSnap.data();
    if (data.baneado) throw new Error("Usuario baneado.");

    const sellosActuales = data.sellos || 0;
    if (sellosActuales < premio.sellosRequeridos) throw new Error("No tienes suficientes sellos.");

    const nuevosSellos = sellosActuales - premio.sellosRequeridos;
    const canjeRef = doc(collection(db, "fermata_canjes"));

    transaction.set(canjeRef, {
      clienteId: userId,
      clienteNombre: data.nombre || userName || "Miembro",
      premioId: premio.id,
      premioNombre: premio.nombre,
      premioIcono: premio.icono,
      sellosDescontados: premio.sellosRequeridos,
      codigo,
      status: "pending",
      creadoEn: serverTimestamp(),
      expiraEn,
    });

    transaction.update(userRef, {
      sellos: increment(-premio.sellosRequeridos),
      recompensaDisponible: nuevosSellos >= STAMPS_PER_REWARD,
      totalCanjesHistoricos: increment(1),
    });

    return canjeRef.id;
  });

  addDoc(collection(db, "fermata_logs"), {
    usuarioId: userId,
    usuarioNombre: userName,
    accion: `Canjeó "${premio.nombre}" (código: ${codigo})`,
    fecha: new Date().toISOString(),
    tipo: "CANJE",
  }).catch(() => {});

  return { canjeId, codigo };
}

/** Marca como expirados los canjes de más de 48h. */
export async function verificarCanjesExpirados(userId: string): Promise<void> {
  try {
    const ahora = new Date().toISOString();
    const snap = await getDocs(
      query(
        collection(db, "fermata_canjes"),
        where("clienteId", "==", userId),
        where("status", "==", "pending")
      )
    );
    const batch = writeBatch(db);
    let changed = false;
    snap.forEach((d) => {
      if (d.data().expiraEn && d.data().expiraEn < ahora) {
        batch.update(d.ref, { status: "expired" });
        changed = true;
      }
    });
    if (changed) await batch.commit();
  } catch { /* no crítico */ }
}

/** Staff da un sello directamente a un cliente (sin QR handshake). */
export async function darSellosManual(
  targetUserId: string,
  targetUserName: string,
  cantidad: number = 1,
): Promise<{ nuevoTotal: number }> {
  const userRef = doc(db, "fermata_usuarios", targetUserId);

  const result = await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error("Usuario no encontrado.");
    const data = userSnap.data();
    if (data.baneado) throw new Error("Usuario baneado.");

    const currentSellos = data.sellos ?? 0;
    const nuevoTotal = currentSellos + cantidad;

    transaction.update(userRef, {
      sellos: increment(cantidad),
      totalSellosHistoricos: increment(cantidad),
      recompensaDisponible: nuevoTotal >= STAMPS_PER_REWARD,
      lastPurchaseAt: new Date().toISOString(),
    });

    return { nuevoTotal, userName: data.nombre || targetUserName };
  });

  addDoc(collection(db, "fermata_logs"), {
    usuarioId: targetUserId,
    usuarioNombre: result.userName,
    accion: `Sello manual acreditado (staff) — total: ${result.nuevoTotal}`,
    fecha: new Date().toISOString(),
    tipo: "SELLO",
    metodo: "MANUAL",
  }).catch(() => {});

  return { nuevoTotal: result.nuevoTotal };
}

/** El staff marca un canje como usado. */
export async function marcarCanjeUsado(canjeId: string): Promise<void> {
  await updateDoc(doc(db, "fermata_canjes", canjeId), {
    status: "used",
    usadoEn: new Date().toISOString(),
  });
}
