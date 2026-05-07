'use client';

import { useState, useMemo } from 'react';
import { crearReserva } from '@/lib/reservas';

const PHONE = '+56941225555';

function getAvailableTimes(): string[] {
  const times: string[] = [];
  for (let h = 17; h < 23; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }
  return times;
}

function getTodayMin(): string {
  return new Date().toISOString().split('T')[0];
}

function buildWhatsAppMessage(nombre: string, guests: string, date: string, time: string, notes: string, reservaId: string) {
  const msg = [
    '📅 *Reserva La Fermata App*',
    `🔖 ID: ${reservaId.slice(0, 8).toUpperCase()}`,
    '',
    `👤 Nombre: ${nombre}`,
    `👥 Personas: ${guests}`,
    `📆 Fecha: ${date}`,
    `🕐 Hora: ${time}`,
    notes ? `📝 Notas: ${notes}` : '',
    '',
    '🔥 ¡Gracias por elegir La Fermata!',
  ].filter(Boolean).join('\n');
  return encodeURIComponent(msg);
}

interface Form {
  nombre: string;
  telefono: string;
  guests: string;
  date: string;
  time: string;
  notas: string;
}

export default function ReservasPage() {
  const [form, setForm] = useState<Form>({
    nombre: '', telefono: '', guests: '2', date: '', time: '', notas: '',
  });
  const [loading, setLoading]   = useState(false);
  const [reservaId, setReservaId] = useState('');
  const [error, setError]       = useState('');

  const times    = useMemo(() => getAvailableTimes(), []);
  const todayMin = useMemo(() => getTodayMin(), []);

  function update(field: keyof Form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const isValid = form.nombre.trim() && form.telefono.trim() && form.date && form.time && form.guests;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      const id = await crearReserva({
        nombre:   form.nombre.trim(),
        telefono: form.telefono.trim(),
        fecha:    form.date,
        hora:     form.time,
        personas: Number(form.guests),
        notas:    form.notas.trim(),
      });
      setReservaId(id);
    } catch {
      setError('No se pudo guardar la reserva. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--cream)',
    borderRadius: '12px',
    padding: '12px 16px',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
  };

  /* ── Pantalla de confirmación ─────────────────────────── */
  if (reservaId) {
    const waUrl = `https://wa.me/${PHONE.replace(/\s/g, '')}?text=${buildWhatsAppMessage(
      form.nombre, form.guests, form.date, form.time, form.notas, reservaId,
    )}`;

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl p-8 text-center space-y-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--cream)' }}>
            ¡Reserva recibida!
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Tu solicitud fue enviada al local. Te contactarán al{' '}
            <strong style={{ color: 'var(--cream)' }}>{form.telefono}</strong> para confirmarla.
          </p>

          {/* ID de reserva */}
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--surface2)', border: '1px solid rgba(201,168,76,0.3)' }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
              Código de reserva
            </p>
            <p className="text-2xl font-black tracking-widest" style={{ color: 'var(--gold)' }}>
              {reservaId.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Resumen */}
          <div className="rounded-xl p-4 text-left space-y-1.5 text-sm"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <p><span style={{ color: 'var(--muted)' }}>Nombre:</span>{' '}
              <strong style={{ color: 'var(--cream)' }}>{form.nombre}</strong></p>
            <p><span style={{ color: 'var(--muted)' }}>Fecha:</span>{' '}
              <strong style={{ color: 'var(--cream)' }}>{form.date}</strong></p>
            <p><span style={{ color: 'var(--muted)' }}>Hora:</span>{' '}
              <strong style={{ color: 'var(--cream)' }}>{form.time} hrs</strong></p>
            <p><span style={{ color: 'var(--muted)' }}>Personas:</span>{' '}
              <strong style={{ color: 'var(--cream)' }}>{form.guests}</strong></p>
          </div>

          {/* WhatsApp opcional */}
          <div className="space-y-2">
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
              style={{ background: '#25D366', color: '#fff' }}>
              <WhatsAppIcon />
              También notificar por WhatsApp
            </a>
            <button onClick={() => {
              setReservaId('');
              setForm({ nombre: '', telefono: '', guests: '2', date: '', time: '', notas: '' });
            }}
              className="text-xs" style={{ color: 'var(--muted)' }}>
              ← Hacer otra reserva
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Formulario ───────────────────────────────────────── */
  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 pt-8 pb-6 text-center" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--cream)' }}>Reservar Mesa</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Solo disponible desde las <strong style={{ color: 'var(--fire)' }}>17:00 hrs</strong>
        </p>
      </div>

      <div className="mx-4 mt-5 rounded-xl px-4 py-3 text-sm"
        style={{ background: 'rgba(232,65,26,0.1)', border: '1px solid rgba(232,65,26,0.3)', color: 'var(--cream)' }}>
        🌅 <strong>Almuerzo sin reserva:</strong> Por orden de llegada.
        Reservas <strong>solo desde las 17:00 hrs</strong>.
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 mt-6 space-y-4">
        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>
            Tu nombre
          </label>
          <input type="text" placeholder="Ej. María González" value={form.nombre}
            onChange={e => update('nombre', e.target.value)} required style={inputStyle} />
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>
            Teléfono de contacto
          </label>
          <input type="tel" placeholder="+56 9 1234 5678" value={form.telefono}
            onChange={e => update('telefono', e.target.value)} required style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>Fecha</label>
            <input type="date" value={form.date} min={todayMin}
              onChange={e => update('date', e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>Hora</label>
            <select value={form.time} onChange={e => update('time', e.target.value)}
              required style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="" disabled>Seleccionar</option>
              {times.map(t => <option key={t} value={t}>{t} hrs</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>
            Número de personas
          </label>
          <select value={form.guests} onChange={e => update('guests', e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>
            Notas (opcional)
          </label>
          <textarea placeholder="Alergias, ocasión especial, preferencias de mesa..."
            value={form.notas} onChange={e => update('notas', e.target.value)}
            rows={3} style={{ ...inputStyle, resize: 'none' }} />
        </div>

        {error && <p className="text-xs text-center" style={{ color: '#ef4444' }}>{error}</p>}

        <button type="submit" disabled={!isValid || loading}
          className="w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{ background: 'var(--fire)', color: '#fff' }}>
          {loading ? 'Guardando reserva…' : 'Solicitar Reserva →'}
        </button>
      </form>

      <div className="max-w-lg mx-auto px-4 mt-8 grid grid-cols-2 gap-3">
        {[
          { icon: '📍', title: 'Ubicación',  body: 'Av. Libertad 1040, Viña del Mar' },
          { icon: '📞', title: 'Contacto',   body: '+56 9 4122 5555' },
          { icon: '🕐', title: 'Horarios',   body: 'Almuerzo y Cena todos los días' },
          { icon: '🚗', title: 'Retiro',     body: 'Takeaway disponible vía WhatsApp' },
        ].map(card => (
          <div key={card.title} className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-2xl mb-2">{card.icon}</div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--cream)' }}>{card.title}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
