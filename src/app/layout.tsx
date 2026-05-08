import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import BottomNav from '@/components/BottomNav';
import LoadingScreen from '@/components/LoadingScreen';
import PwaInstallBanner from '@/components/PwaInstallBanner';
import ActiveOrderBanner from '@/components/ActiveOrderBanner';

export const metadata: Metadata = {
  title: 'La Fermata – Pizzería Napoletana | Viña del Mar',
  description: 'Pizzas napoletanas y pastas frescas artesanales en Viña del Mar. Av. Libertad 1040. Reservas desde las 17:00 hrs.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'La Fermata',
  },
  openGraph: {
    title: 'La Fermata – Pizzería Napoletana',
    description: 'Un terminal de sabores en Viña del Mar',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0b09',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
        <CartProvider>
          <LoadingScreen />
          <Navbar />
          <main className="flex-1">{children}</main>
          <CartDrawer />
          <PwaInstallBanner />
          <ActiveOrderBanner />
          <BottomNav />
          <footer className="py-8 text-center text-sm" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
            <p>La Fermata · Av. Libertad 1040, Viña del Mar</p>
            <p className="mt-1">
              <a href="tel:+56941225555" className="hover:underline">+56 9 4122 5555</a>
              {' · '}
              <a href="https://www.lafermata.cl" target="_blank" rel="noopener noreferrer" className="hover:underline">www.lafermata.cl</a>
              {' · '}
              <a href="https://instagram.com/lafermatapizzas" target="_blank" rel="noopener noreferrer" className="hover:underline">@lafermatapizzas</a>
            </p>
            <p className="mt-2 text-xs">Almuerzo: orden de llegada · Reservas solo desde las 17:00 hrs</p>
          </footer>
        </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
