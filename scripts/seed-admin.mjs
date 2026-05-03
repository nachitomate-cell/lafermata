/**
 * Seed inicial con Firebase Admin SDK (usa service account, bypasea reglas).
 * Ejecutar UNA SOLA VEZ:
 *
 *   node scripts/seed-admin.mjs
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Carga dinámica de firebase-admin
let admin;
try {
  admin = require("firebase-admin");
} catch {
  console.error("❌  firebase-admin no está instalado. Ejecuta:\n   npm install --save-dev firebase-admin\n");
  process.exit(1);
}

// Ruta al service account (en la raíz del proyecto)
const SA_PATH = join(__dirname, "..", "lafermata-fa9d5-firebase-adminsdk-fbsvc-c8898e18a9.json");
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SA_PATH, "utf8"));
} catch {
  console.error("❌  No se encontró el archivo de service account en:\n  ", SA_PATH);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ── Premios del club ──────────────────────────────────────────────────────────
const premios = [
  { nombre: "Pan de Ajo",        descripcion: "Pan artesanal de ajos asados, mozzarella y parmesano",   sellosRequeridos: 5,  icono: "🧄", activo: true, stock: null },
  { nombre: "Postre a elección", descripcion: "Tiramisú, Cannoli o Brownie al Cioccolato",               sellosRequeridos: 8,  icono: "🍮", activo: true, stock: null },
  { nombre: "Pizza Margherita",  descripcion: "Pizza individual Margherita — la clásica napoletana",     sellosRequeridos: 12, icono: "🍕", activo: true, stock: null },
  { nombre: "Pizza a elección",  descripcion: "Una pizza individual de la carta a tu gusto",             sellosRequeridos: 15, icono: "🔥", activo: true, stock: null },
  { nombre: "Cena para 2",       descripcion: "2 pizzas + 2 bebidas. Reserva previa requerida.",         sellosRequeridos: 30, icono: "🍷", activo: true, stock: null },
];

async function seed() {
  console.log("🔥  Seed La Fermata Club → proyecto: lafermata-fa9d5\n");

  // ── Premios ───────────────────────────────────────────────────────────────
  const existing = await db.collection("fermata_premios").get();
  if (!existing.empty) {
    console.log(`⚠️  Ya existen ${existing.size} premios en fermata_premios. Saltando.`);
  } else {
    for (const p of premios) {
      const ref = await db.collection("fermata_premios").add(p);
      console.log(`✅  ${p.icono}  ${p.nombre}  (${p.sellosRequeridos} sellos) → ${ref.id}`);
    }
    console.log(`\n🎉  ${premios.length} premios creados.`);
  }

  console.log("\n──────────────────────────────────────────");
  console.log("Próximos pasos:");
  console.log("  1. Firebase Console → Authentication → Habilitar Email/Password");
  console.log("  2. Firebase Console → Authentication → Agregar usuario staff");
  console.log("  3. Firestore → fermata_usuarios → Crear doc con ese UID y rol:'staff'");
  console.log("  4. Aplicar firestore.rules en Firebase Console → Firestore → Rules");
  console.log("  5. (Opcional) .env.local → agregar NEXT_PUBLIC_STAFF_EMAIL + PASSWORD");
  process.exit(0);
}

seed().catch(e => { console.error("Error:", e); process.exit(1); });
