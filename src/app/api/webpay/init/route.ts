import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

const TBK_HOST   = 'webpay3gcloud.transbank.cl';
const TBK_PATH   = '/rswebpaytransaction/api/webpay/v1.2/transactions';
const TBK_KEY_ID = '597055555532';
const TBK_SECRET = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';

function tbkRequest(
  method: string,
  path: string,
  body?: string,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const extraHeaders: Record<string, string | number> = body
      ? { 'Content-Length': Buffer.byteLength(body) }
      : {};

    const req = https.request(
      {
        hostname: TBK_HOST,
        port: 443,
        path,
        method,
        // Force IPv4 — undici/fetch can fail on Windows when it resolves IPv6
        // and the peer is not reachable over that protocol.
        family: 4,
        headers: {
          'Tbk-Api-Key-Id': TBK_KEY_ID,
          'Tbk-Api-Key-Secret': TBK_SECRET,
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text }));
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  const { amount, buyOrder, sessionId, returnUrl } = await req.json();

  const body = JSON.stringify({
    buy_order: buyOrder,
    session_id: sessionId,
    amount,
    return_url: returnUrl,
  });

  const { status, text } = await tbkRequest('POST', TBK_PATH, body);

  if (status < 200 || status >= 300) {
    return NextResponse.json({ error: text }, { status: 502 });
  }

  return NextResponse.json(JSON.parse(text));
}
