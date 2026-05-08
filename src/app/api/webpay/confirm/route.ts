import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

const TBK_HOST   = 'webpay3gcloud.transbank.cl';
const TBK_PATH   = '/rswebpaytransaction/api/webpay/v1.2/transactions';
const TBK_KEY_ID = '597055555532';
const TBK_SECRET = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';

function tbkRequest(
  method: string,
  path: string,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: TBK_HOST,
        port: 443,
        path,
        method,
        family: 4,
        headers: {
          'Tbk-Api-Key-Id': TBK_KEY_ID,
          'Tbk-Api-Key-Secret': TBK_SECRET,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

// ── Server-side Firestore confirm ─────────────────────────────────────────────
// Updates the pedido status to en_preparacion using the public Firestore REST API.
// This is best-effort: if it fails the client-side call in /webpay/resultado still runs.

interface FirestoreItem {
  nombre: string;
  cantidad: number;
  precio: number;
}

async function confirmarPedidoServer(
  buyOrder: string,
  authCode: string,
): Promise<FirestoreItem[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return [];

  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;

  const queryRes = await fetch(`${base}/documents:runQuery?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'fermata_pedidos' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'buyOrder' },
            op: 'EQUAL',
            value: { stringValue: buyOrder },
          },
        },
        limit: 1,
      },
    }),
  });

  const results: Array<{ document?: { name: string; fields: Record<string, { stringValue?: string; arrayValue?: { values?: Array<{ mapValue?: { fields: Record<string, unknown> } }> } }> } }> = await queryRes.json();
  const firestoreDoc = results[0]?.document;
  if (!firestoreDoc) return [];

  if (firestoreDoc.fields?.status?.stringValue !== 'pending') return [];

  await fetch(
    `${firestoreDoc.name}?` +
    `updateMask.fieldPaths=status&updateMask.fieldPaths=authCode&updateMask.fieldPaths=confirmedAt&key=${apiKey}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          status:      { stringValue: 'en_preparacion' },
          authCode:    { stringValue: authCode },
          confirmedAt: { stringValue: new Date().toISOString() },
        },
      }),
    },
  );

  // Auto welcome message in chat (best-effort)
  const docId = firestoreDoc.name.split('/').pop()!;
  fetch(
    `${base}/documents/fermata_chats/${docId}/messages?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          text:      { stringValue: '¡Hola! Hemos recibido tu pedido. Lo estamos revisando para pasarlo a cocina.' },
          sender:    { stringValue: 'system' },
          timestamp: { timestampValue: new Date().toISOString() },
          read:      { booleanValue: false },
        },
      }),
    },
  ).catch(() => {});

  // Extract items for the kitchen notification
  const rawItems = firestoreDoc.fields?.items?.arrayValue?.values ?? [];
  const items: FirestoreItem[] = rawItems.map((v) => {
    const f = v.mapValue?.fields ?? {};
    return {
      nombre:   (f.nombre as { stringValue?: string })?.stringValue ?? '',
      cantidad: Number((f.cantidad as { integerValue?: string; doubleValue?: number })?.integerValue ?? (f.cantidad as { doubleValue?: number })?.doubleValue ?? 1),
      precio:   Number((f.precio as { integerValue?: string; doubleValue?: number })?.integerValue ?? (f.precio as { doubleValue?: number })?.doubleValue ?? 0),
    };
  });

  return items;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
  let tokenWs: string | null = null;

  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    tokenWs = form.get('token_ws') as string | null;
  } else {
    const body = await req.json().catch(() => ({}));
    tokenWs = body.token_ws ?? null;
  }

  if (!tokenWs) {
    return NextResponse.redirect(`${origin}/webpay/resultado?status=cancelado`);
  }

  const { status, text } = await tbkRequest('PUT', `${TBK_PATH}/${tokenWs}`);

  if (status < 200 || status >= 300) {
    return NextResponse.redirect(`${origin}/webpay/resultado?status=error`);
  }

  const data = JSON.parse(text);

  if (data.status === 'AUTHORIZED') {
    const buyOrder = data.buy_order ?? '';
    const authCode = data.authorization_code ?? '';
    const amount   = data.amount ?? 0;

    // Server-side: confirm order in Firestore + notify kitchen (fire and forget)
    confirmarPedidoServer(buyOrder, authCode)
      .then((items) => {
        fetch(`${origin}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'pedido_nuevo', buyOrder, items, amount }),
        }).catch(() => {});
      })
      .catch(() => {});

    return NextResponse.redirect(`${origin}/order/${buyOrder}?paid=1&auth=${authCode}`);
  }

  return NextResponse.redirect(`${origin}/webpay/resultado?status=rechazado`);
}
