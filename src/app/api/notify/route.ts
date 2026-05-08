import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_STAFF_CHAT_ID;

if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:info@lafermata.cl',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

async function sendTelegram(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' }),
  });
}

async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return;
  const normalized = to.replace(/\s/g, '');
  const from = TWILIO_FROM.startsWith('whatsapp:') ? TWILIO_FROM : `whatsapp:${TWILIO_FROM}`;
  const toWa = normalized.startsWith('whatsapp:') ? normalized : `whatsapp:${normalized}`;
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
      },
      body: new URLSearchParams({ From: from, To: toWa, Body: body }).toString(),
    },
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type } = body as { type: string };

  try {
    if (type === 'reserva_nueva') {
      const { id, nombre, telefono, fecha, hora, personas, notas } = body as {
        id: string; nombre: string; telefono: string;
        fecha: string; hora: string; personas: string; notas: string;
      };
      await sendTelegram(
        `📅 *Nueva reserva*\n` +
        `🔖 ID: \`${id.slice(0, 8).toUpperCase()}\`\n` +
        `👤 ${nombre}  •  👥 ${personas} personas\n` +
        `📆 ${fecha} a las ${hora} hrs\n` +
        `📞 ${telefono}` +
        (notas ? `\n📝 ${notas}` : ''),
      );
    }

    if (type === 'reserva_confirmada') {
      const { id, nombre, telefono, fecha, hora, personas } = body as {
        id: string; nombre: string; telefono: string;
        fecha: string; hora: string; personas: number;
      };
      await sendTelegram(
        `✅ *Reserva confirmada*\n` +
        `🔖 \`${id.slice(0, 8).toUpperCase()}\`  •  👤 ${nombre}\n` +
        `📆 ${fecha}  🕐 ${hora} hrs  •  👥 ${personas} persona${Number(personas) !== 1 ? 's' : ''}`,
      );
      const clientMsg =
        `🎉 ¡Hola ${nombre}! Tu reserva en *La Fermata* está *confirmada* ✅\n\n` +
        `📅 ${fecha} a las ${hora} hrs\n` +
        `👥 ${personas} persona${Number(personas) !== 1 ? 's' : ''}\n` +
        `🔖 Código: \`${id.slice(0, 8).toUpperCase()}\`\n\n` +
        `Te esperamos en Av. Libertad 1040, Viña del Mar 🍕`;
      await sendWhatsApp(telefono, clientMsg);
    }

    if (type === 'pedido_nuevo') {
      const { buyOrder, items, amount } = body as {
        buyOrder: string;
        items: Array<{ nombre: string; cantidad: number; precio: number }>;
        amount: number;
      };
      const lines = items.map(i => `  • ${i.cantidad}× ${i.nombre}`).join('\n');
      await sendTelegram(
        `🍕 *Nuevo pedido online*\n` +
        `🔖 \`${buyOrder.slice(-8).toUpperCase()}\`\n` +
        `${lines}\n` +
        `💰 Total: $${Number(amount).toLocaleString('es-CL')}`,
      );
    }
    if (type === 'pedido_listo') {
      const { subscription, buyOrder } = body as {
        subscription: PushSubscriptionJSON;
        buyOrder: string;
      };
      if (subscription?.endpoint) {
        await webpush.sendNotification(
          subscription as webpush.PushSubscription,
          JSON.stringify({
            title: '🎉 ¡Tu pedido está listo!',
            body: 'Pasa a retirarlo en Av. Libertad 1040, Viña del Mar',
            url: `/order/${buyOrder}`,
          }),
        );
      }
    }

    if (type === 'mensaje_staff') {
      const { subscription, buyOrder, text } = body as {
        subscription: PushSubscriptionJSON;
        buyOrder: string;
        text: string;
      };
      if (subscription?.endpoint) {
        await webpush.sendNotification(
          subscription as webpush.PushSubscription,
          JSON.stringify({
            title: '💬 La Fermata',
            body: text,
            url: `/order/${buyOrder}`,
          }),
        );
      }
    }
  } catch {
    // Notifications are best-effort
  }

  return NextResponse.json({ ok: true });
}
