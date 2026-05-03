/**
 * Seed inicial de premios para La Fermata Club.
 * Ejecutar UNA SOLA VEZ después de configurar Firebase:
 *
 *   node scripts/seed-premios.mjs
 *
 * Requiere variables de entorno en .env.local o exportadas en la terminal.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCGwNEBNmyrOl1mrpZhGNEktneNtxYgxj0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-7914495232-557f1.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-7914495232-557f1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-7914495232-557f1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "120681935080",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:120681935080:web:d41757280ca888b46bd95d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const premios = [
  {
    nombre: "Pan de Ajo",
    descripcion: "Pan artesanal de ajos asados, mozzarella y parmesano",
    sellosRequeridos: 5,
    icono: "🧄",
    activo: true,
    stock: null,
  },
  {
    nombre: "Postre a elección",
    descripcion: "Tiramisú, Cannoli o Brownie al Cioccolato",
    sellosRequeridos: 8,
    icono: "🍮",
    activo: true,
    stock: null,
  },
  {
    nombre: "Pizza Margherita",
    descripcion: "Pizza individual Margherita — la clásica napoletana",
    sellosRequeridos: 12,
    icono: "🍕",
    activo: true,
    stock: null,
  },
  {
    nombre: "Pizza a elección",
    descripcion: "Una pizza individual de la carta a tu gusto",
    sellosRequeridos: 15,
    icono: "🔥",
    activo: true,
    stock: null,
  },
  {
    nombre: "Cena para 2",
    descripcion: "2 pizzas individuales + 2 bebidas. Reserva previa requerida.",
    sellosRequeridos: 30,
    icono: "🍷",
    activo: true,
    stock: null,
  },
];

async function seed() {
  console.log("🔥 Seeding premios for La Fermata Club...\n");

  const q = query(collection(db, "fermata_premios"));
  const existing = await getDocs(q);
  if (!existing.empty) {
    console.log(`⚠️  Ya existen ${existing.size} premios en fermata_premios. Abortando para no duplicar.`);
    console.log("   Elimínalos manualmente en Firestore Console si quieres re-seedear.");
    process.exit(0);
  }

  for (const premio of premios) {
    const ref = await addDoc(collection(db, "fermata_premios"), premio);
    console.log(`✅  ${premio.icono}  ${premio.nombre}  (${premio.sellosRequeridos} sellos)  → ID: ${ref.id}`);
  }

  console.log(`\n✨ Seed completado: ${premios.length} premios creados.`);
  console.log("\nPróximos pasos:");
  console.log("  1. En Firebase Console > Authentication > Sign-in providers: activa Email/Password");
  console.log("  2. En Firebase Console > Firestore > Rules: pega el contenido de firestore.rules");
  console.log("  3. Para asignar rol staff a un usuario: edita su doc en fermata_usuarios y pon rol:'staff'");
  console.log("  4. El PIN del staff es: 4321  (cámbialo con NEXT_PUBLIC_STAFF_PIN en .env.local)\n");
  process.exit(0);
}

seed().catch(e => { console.error("Error:", e); process.exit(1); });
