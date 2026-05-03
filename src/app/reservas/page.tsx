'use client';

import { useState, useMemo } from 'react';

const RESERVATION_START_HOUR = 17;
const PHONE = '+56941225555';

function getAvailableTimes(): string[] {
  const times: string[] = [];
  for (let h = RESERVATION_START_HOUR; h < 23; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }
  return times;
}

function getTodayMin(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function buildWhatsAppReservation(form: ReservationForm) {
  const msg = [
    '📅 *Reserva La Fermata*',
    '',
    `👤 Nombre: ${form.name}`,
    `👥 Personas: ${form.guests}`,
    `📆 Fecha: ${form.date}`,
    `🕐 Hora: ${form.time}`,
    form.notes ? `📝 Notas: ${form.notes}` : '',
    '',
    '🔥 ¡Gracias por elegir La Fermata!',
  ].filter(Boolean).join('\n');
  return encodeURIComponent(msg);
}

interface ReservationForm {
  name: string;
  guests: string;
  date: string;
  time: string;
  notes: string;
}

export default function ReservasPage() {
  const [form, setForm] = useState<ReservationForm>({
    name: '',
    guests: '2',
    date: '',
    time: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const times = useMemo(() => getAvailableTimes(), []);
  const todayMin = useMemo(() => getTodayMin(), []);

  function update(field: keyof ReservationForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const isValid = form.name.trim() && form.date && form.time && form.guests;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitted(true);
  }

  if (submitted) {
    const url = `https://wa.me/${PHONE.replace(/\s/g, '')}?text=${buildWhatsAppReservation(form)}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="w-full max-w-md rounded-3xl p-8 text-center space-y-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--cream)' }}>
            ¡Ya casi está!
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Toca el botón para enviar tu solicitud de reserva por WhatsApp.
            Un miembro del equipo la confirmará a la brevedad.
          </p>
          <div
            className="rounded-xl p-4 text-left space-y-1 text-sm"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            <p><span style={{ color: 'var(--muted)' }}>Nombre:</span> <strong style={{ color: 'var(--cream)' }}>{form.name}</strong></p>
            <p><span style={{ color: 'var(--muted)' }}>Fecha:</span> <strong style={{ color: 'var(--cream)' }}>{form.date}</strong></p>
            <p><span style={{ color: 'var(--muted)' }}>Hora:</span> <strong style={{ color: 'var(--cream)' }}>{form.time}</strong></p>
            <p><span style={{ color: 'var(--muted)' }}>Personas:</span> <strong style={{ color: 'var(--cream)' }}>{form.guests}</strong></p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl py-4 text-sm font-bold"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Confirmar por WhatsApp
          </a>
          <button
            onClick={() => setSubmitted(false)}
            className="text-xs"
            style={{ color: 'var(--muted)' }}
          >
            ← Editar reserva
          </button>
        </div>
      </div>
    );
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

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div
        className="px-4 pt-8 pb-6 text-center"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="text-2xl font-bold" style={{ color: 'var(--cream)' }}>Reservar Mesa</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Solo disponible desde las <strong style={{ color: 'var(--fire)' }}>17:00 hrs</strong>
        </p>
      </div>

      {/* Notice banner */}
      <div
        className="mx-4 mt-5 rounded-xl px-4 py-3 text-sm"
        style={{ background: 'rgba(232,65,26,0.1)', border: '1px solid rgba(232,65,26,0.3)', color: 'var(--cream)' }}
      >
        🌅 <strong>Almuerzo sin reserva:</strong> Los horarios de almuerzo son por orden de llegada. Las reservas aplican <strong>solo desde las 17:00 hrs</strong>.
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 mt-6 space-y-4">
        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>
            Tu nombre
          </label>
          <input
            type="text"
            placeholder="Ej. María González"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>
              Fecha
            </label>
            <input
              type="date"
              value={form.date}
              min={todayMin}
              onChange={e => update('date', e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>
              Hora
            </label>
            <select
              value={form.time}
              onChange={e => update('time', e.target.value)}
              required
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="" disabled>Seleccionar</option>
              {times.map(t => (
                <option key={t} value={t}>{t} hrs</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>
            Número de personas
          </label>
          <select
            value={form.guests}
            onChange={e => update('guests', e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--muted)' }}>
            Notas (opcional)
          </label>
          <textarea
            placeholder="Alergias, ocasión especial, preferencias de mesa..."
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{ background: 'var(--fire)', color: '#fff' }}
        >
          Confirmar Reserva →
        </button>
      </form>

      {/* Info cards */}
      <div className="max-w-lg mx-auto px-4 mt-8 grid grid-cols-2 gap-3">
        {[
          { icon: '📍', title: 'Ubicación', body: 'Av. Libertad 1040, Viña del Mar' },
          { icon: '📞', title: 'Contacto', body: '+56 9 4122 5555' },
          { icon: '🕐', title: 'Horarios', body: 'Almuerzo y Cena todos los días' },
          { icon: '🚗', title: 'Retiro', body: 'Takeaway disponible vía WhatsApp' },
        ].map(card => (
          <div
            key={card.title}
            className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--cream)' }}>{card.title}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
