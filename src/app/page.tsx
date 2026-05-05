import Link from 'next/link';
import Image from 'next/image';

const highlights = [
  {
    icon: '🔥',
    title: 'Horno a Leña',
    body: 'Nuestras pizzas se hornean en horno artesanal a leña, logrando la textura y sabor napoletano auténtico.',
  },
  {
    icon: '⏳',
    title: 'Masa de Fermentación Lenta',
    body: 'Masa elaborada con fermentación de hasta 72 horas para una digestión ligera y sabor profundo.',
  },
  {
    icon: '🍅',
    title: 'Ingredientes Premium',
    body: 'Tomate San Marzano, mozzarella fresca, stracciatella y productos importados seleccionados.',
  },
  {
    icon: '🏆',
    title: '50 Top Pizza LATAM 2026',
    body: 'Reconocidos entre las mejores pizzerías de Latinoamérica por la guía 50 Top Pizza.',
  },
];

const menuFeatures = [
  { image: '/images/menu/pizza.svg',       label: 'Pizzas Napoletanas', count: '26 variedades' },
  { image: '/images/menu/pasta-larga.svg', label: 'Pastas Artesanales', count: 'Largas, cortas y rellenas' },
  { image: '/images/menu/risotto.svg',     label: 'Risottos',           count: '3 opciones premium' },
  { image: '/images/menu/sin-gluten.svg',  label: 'Sin Gluten',         count: 'Pizzas y pastas' },
  { image: '/images/menu/bambini.svg',     label: 'Menú Bambini',       count: 'Para los más chicos' },
  { image: '/images/menu/postre.svg',      label: 'Postres',            count: 'Tiramisú y más' },
];

export default function HomePage() {
  return (
    <div className="pb-20">

      {/* ── Hero con foto del local ─────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-24 overflow-hidden"
        style={{ minHeight: '80vh' }}
      >
        {/* Foto de fondo */}
        <div className="absolute inset-0">
          <Image
            src="/images/local.webp"
            alt="La Fermata – Viña del Mar"
            fill
            className="object-cover object-top"
            priority
          />
          {/* Overlay degradado: más oscuro arriba y abajo para legibilidad */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(12,11,9,0.72) 0%, rgba(12,11,9,0.38) 45%, rgba(12,11,9,0.82) 100%)',
            }}
          />
        </div>

        {/* Contenido */}
        <div className="relative z-10 space-y-5 max-w-xl">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold anim-fade-in-up"
            style={{
              background: 'rgba(201,168,76,0.18)',
              border: '1px solid rgba(201,168,76,0.5)',
              color: 'var(--gold)',
              backdropFilter: 'blur(8px)',
              animationDelay: '0ms',
            }}
          >
            🏆 50 Top Pizza Latin América 2026
          </div>

          {/* Badge logo */}
          <div className="flex justify-center anim-fade-in-up" style={{ animationDelay: '80ms' }}>
            <div
              className="relative w-20 h-20 rounded-full overflow-hidden"
              style={{ border: '2px solid rgba(232,65,26,0.6)', boxShadow: '0 0 24px rgba(232,65,26,0.25)' }}
            >
              <Image
                src="/images/logo2.jpg"
                alt="La Fermata"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-black leading-tight tracking-tight anim-fade-in-up"
            style={{ color: 'var(--cream)', animationDelay: '160ms' }}
          >
            Un Terminal<br />
            <span style={{ color: 'var(--fire)' }}>de Sabores</span>
          </h1>

          <p className="text-base anim-fade-in-up" style={{ color: 'rgba(245,240,232,0.85)', animationDelay: '240ms' }}>
            Pizzería napoletana artesanal en el corazón de Viña del Mar.<br />
            Horno a leña · Masa de fermentación lenta · Ingredientes premium.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 anim-fade-in-up" style={{ animationDelay: '320ms' }}>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{ background: 'var(--fire)', color: '#fff' }}
            >
              🍕 Ver la Carta
            </Link>
            <Link
              href="/reservas"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{
                background: 'rgba(30,27,22,0.8)',
                color: 'var(--cream)',
                border: '1px solid rgba(245,240,232,0.25)',
                backdropFilter: 'blur(8px)',
              }}
            >
              📅 Reservar Mesa
            </Link>
          </div>
        </div>
      </section>

      {/* ── Almuerzo notice ────────────────────────────────── */}
      <section className="px-4 max-w-2xl mx-auto -mt-4 mb-8 anim-fade-in-up" style={{ animationDelay: '420ms' }}>
        <div
          className="rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <span className="text-2xl mt-0.5">🌅</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Almuerzo por orden de llegada</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Los horarios de almuerzo son sin reserva. Las reservas están disponibles{' '}
              <strong style={{ color: 'var(--fire)' }}>solo desde las 17:00 hrs</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ── Nuestro Local ──────────────────────────────────── */}
      <section className="px-4 max-w-2xl mx-auto mb-12 anim-fade-in-up" style={{ animationDelay: '500ms' }}>
        <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <Image
            src="/images/local.webp"
            alt="La Fermata – Fachada Viña del Mar"
            fill
            className="object-cover object-center"
          />
          {/* Overlay inferior con info */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(12,11,9,0.85) 0%, transparent 55%)' }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
            <div>
              <p className="text-base font-black" style={{ color: 'var(--cream)' }}>La Fermata</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(245,240,232,0.7)' }}>Viña del Mar, Chile</p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(232,65,26,0.9)', color: '#fff' }}
            >
              📍 Ver mapa
            </div>
          </div>
        </div>
      </section>

      {/* ── Menu categories preview ────────────────────────── */}
      <section className="px-4 max-w-2xl mx-auto mb-12">
        <h2 className="text-lg font-bold mb-4 anim-fade-in-up" style={{ color: 'var(--cream)', animationDelay: '560ms' }}>Nuestra Propuesta</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {menuFeatures.map((f, i) => (
            <Link
              key={f.label}
              href="/menu"
              className="rounded-2xl p-4 flex flex-col gap-2 transition-all hover:-translate-y-1 active:scale-95 anim-fade-in-up"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${600 + i * 60}ms` }}
            >
              <div className="relative w-14 h-14">
                <Image src={f.image} alt={f.label} fill className="object-contain" unoptimized />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>{f.label}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{f.count}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Highlights ─────────────────────────────────────── */}
      <section className="px-4 max-w-2xl mx-auto mb-12">
        <h2 className="text-lg font-bold mb-4 anim-fade-in-up" style={{ color: 'var(--cream)', animationDelay: '960ms' }}>Por qué La Fermata</h2>
        <div className="space-y-3">
          {highlights.map((h, i) => (
            <div
              key={h.title}
              className="flex items-start gap-4 rounded-2xl p-4 anim-fade-in-up"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${1000 + i * 80}ms` }}
            >
              <span className="text-3xl mt-0.5">{h.icon}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--cream)' }}>{h.title}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>{h.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Loyalty club ───────────────────────────────────── */}
      <section className="px-4 max-w-2xl mx-auto mb-12">
        <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(232,65,26,0.35)' }}>
          {/* Header con fondo.avif como textura */}
          <div
            className="relative px-6 pt-6 pb-5 text-center space-y-2 overflow-hidden"
          >
            {/* Textura de fondo */}
            <div className="absolute inset-0">
              <Image
                src="/images/fondo.avif"
                alt=""
                fill
                className="object-cover object-center"
                aria-hidden="true"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(12,11,9,0.88) 0%, rgba(12,11,9,0.82) 100%)' }}
              />
            </div>

            <div className="relative z-10 space-y-2">
              {/* Badge logo */}
              <div className="flex justify-center mb-1">
                <div
                  className="relative w-14 h-14 rounded-full overflow-hidden"
                  style={{ border: '2px solid rgba(201,168,76,0.6)', boxShadow: '0 0 16px rgba(201,168,76,0.2)' }}
                >
                  <Image src="/images/logo2.jpg" alt="La Fermata Club" fill className="object-cover" />
                </div>
              </div>
              <h3 className="text-lg font-black" style={{ color: 'var(--cream)' }}>
                La Fermata Club
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Acumula sellos con cada visita. Cada 5 sellos, un premio gratis.
              </p>
            </div>
          </div>

          {/* Benefits grid */}
          <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border)' }}>
            {[
              { icon: '🔥', text: '1 sello por visita' },
              { icon: '🎁', text: 'Premio cada 5 sellos' },
              { icon: '👑', text: '4 niveles de membresía' },
              { icon: '📱', text: 'QR personal en tu teléfono' },
            ].map(b => (
              <div key={b.text} className="flex items-center gap-3 px-4 py-3" style={{ background: 'var(--surface)' }}>
                <span className="text-xl">{b.icon}</span>
                <p className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>{b.text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="p-4" style={{ background: 'var(--surface)' }}>
            <a
              href="/club/unete"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #e8411a, #c9a84c)', color: '#fff' }}
            >
              🚀 Unirme gratis al club
            </a>
            <p className="text-center text-xs mt-3" style={{ color: 'var(--muted)' }}>
              ¿Ya eres miembro?{' '}
              <a href="/club" className="underline" style={{ color: 'var(--fire)' }}>Ver mi club</a>
            </p>
          </div>
        </div>
      </section>

      {/* ── Takeaway CTA ───────────────────────────────────── */}
      <section className="px-4 max-w-2xl mx-auto">
        <div
          className="rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <h3 className="font-bold" style={{ color: 'var(--cream)' }}>¿Pedido para llevar?</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Arma tu pedido en la carta y envíalo directo al WhatsApp del local.
            </p>
          </div>
          <Link
            href="/menu"
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Pedir por WhatsApp
          </Link>
        </div>
      </section>
    </div>
  );
}
