import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

export const FLAVOR_NODES = [
  { id: 'pomodoro', label: 'Pomodoro',  color: '#e8411a', emoji: '🍅', desc: 'Salsas de tomate, pizzas clásicas' },
  { id: 'crema',    label: 'Crema',     color: '#f5d78e', emoji: '🤍', desc: 'Salsas blancas, risottos' },
  { id: 'pesto',    label: 'Pesto',     color: '#22c55e', emoji: '🌿', desc: 'Pesto, albahaca, hierbas' },
  { id: 'mar',      label: 'Mare',      color: '#3b82f6', emoji: '🌊', desc: 'Mariscos, salmón, del mar' },
  { id: 'fungi',    label: 'Funghi',    color: '#a855f7', emoji: '🍄', desc: 'Champiñones, tartufo' },
  { id: 'carne',    label: 'Carne',     color: '#f59e0b', emoji: '🥩', desc: 'Carnes, embutidos, pollo' },
  { id: 'dolce',    label: 'Dolce',     color: '#ec4899', emoji: '🍮', desc: 'Postres, dulces' },
] as const;

export type FlavorId = typeof FLAVOR_NODES[number]['id'];

export type FlavorProfile = Record<FlavorId, number>;

export function emptyProfile(): FlavorProfile {
  return { pomodoro: 0, crema: 0, pesto: 0, mar: 0, fungi: 0, carne: 0, dolce: 0 };
}

// Given a flavor profile, return weights normalized to 0-1
export function normalizeProfile(profile: FlavorProfile): Record<FlavorId, number> {
  const total = Object.values(profile).reduce((s, v) => s + v, 0) || 1;
  const result = {} as Record<FlavorId, number>;
  for (const node of FLAVOR_NODES) {
    result[node.id] = profile[node.id] / total;
  }
  return result;
}

export function dominantFlavor(profile: FlavorProfile): (typeof FLAVOR_NODES)[number] {
  let maxNode: (typeof FLAVOR_NODES)[number] = FLAVOR_NODES[0];
  let maxVal = -1;
  for (const node of FLAVOR_NODES) {
    if (profile[node.id] > maxVal) { maxVal = profile[node.id]; maxNode = node; }
  }
  return maxNode;
}

// Merge flavorProfile from Firestore (may have missing keys) into a full profile
export function coerceProfile(raw: Partial<FlavorProfile> | undefined): FlavorProfile {
  const base = emptyProfile();
  if (!raw) return base;
  for (const node of FLAVOR_NODES) {
    if (typeof raw[node.id] === 'number') base[node.id] = raw[node.id]!;
  }
  return base;
}

// Increment flavor weights in Firestore for a user
export async function actualizarDNAFlavor(
  userId: string,
  deltas: Partial<FlavorProfile>
): Promise<void> {
  const ref = doc(db, 'fermata_usuarios', userId);
  const updates: Record<string, ReturnType<typeof increment>> = {};
  for (const [key, val] of Object.entries(deltas)) {
    if (val && val > 0) updates[`flavorProfile.${key}`] = increment(val);
  }
  if (Object.keys(updates).length > 0) {
    await updateDoc(ref, updates);
  }
}
