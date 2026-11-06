// Talks to the PayPal REST API (sandbox by default).
const base = () => process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

let cached = { token: null, expires: 0 };

async function getAccessToken() {
  if (cached.token && Date.now() < cached.expires) return cached.token;
  const { PAYPAL_CLIENT_ID: id, PAYPAL_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret || id.startsWith('your_')) {
    const err = new Error('PayPal keys are missing. Add them to .env and restart the server.');
    err.status = 500;
    throw err;
  }
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('PayPal auth failed:', data);
    const err = new Error('PayPal rejected the Client ID or Secret. Check .env (use the Sandbox tab).');
    err.status = 500;
    throw err;
  }
  cached = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return cached.token;
}

async function createOrder(totalCents, description) {
  const token = await getAccessToken();
  const res = await fetch(`${base()}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ description, amount: { currency_code: 'USD', value: (totalCents / 100).toFixed(2) } }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Create order failed:', data);
    throw new Error('PayPal could not create the order.');
  }
  return data.id;
}

async function captureOrder(orderId) {
  const token = await getAccessToken();
  const res = await fetch(`${base()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Capture failed:', data);
    throw new Error('PayPal could not capture the payment.');
  }
  return data;
}

module.exports = { createOrder, captureOrder };
