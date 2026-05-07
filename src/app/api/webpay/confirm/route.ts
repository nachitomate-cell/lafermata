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
    const params = new URLSearchParams({
      status: 'exitoso',
      order: data.buy_order ?? '',
      amount: String(data.amount ?? ''),
      auth: data.authorization_code ?? '',
    });
    return NextResponse.redirect(`${origin}/webpay/resultado?${params}`);
  }

  return NextResponse.redirect(`${origin}/webpay/resultado?status=rechazado`);
}
