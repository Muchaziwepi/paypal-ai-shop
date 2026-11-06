require('dotenv').config();
const express = require('express');
const path = require('path');
const products = require('./lib/products');
const paypal = require('./lib/paypal');
const orders = require('./lib/orders');
const { askAssistant } = require('./lib/ai');

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (status, message) => Object.assign(new Error(message), { status });

// Carts waiting for payment, keyed by PayPal order id. Prices come from the server only.
const pending = new Map();

function priceCart(items) {
  if (!Array.isArray(items) || items.length === 0) throw fail(400, 'Your cart is empty.');
  const lines = [];
  let totalCents = 0;
  for (const raw of items.slice(0, 20)) {
    const product = products.find((p) => p.id === Number(raw.id));
    if (!product) throw fail(400, 'One of the items in your cart no longer exists.');
    const qty = Math.min(10, Math.max(1, parseInt(raw.qty, 10) || 1));
    lines.push({ id: product.id, name: product.name, price: product.price, qty });
    totalCents += Math.round(product.price * 100) * qty;
  }
  return { lines, totalCents };
}

app.get('/api/config', (req, res) => {
  const id = process.env.PAYPAL_CLIENT_ID || '';
  res.json({
    clientId: id,
    paypalConfigured: Boolean(id) && !id.startsWith('your_'),
    aiEnabled: Boolean(process.env.AI_API_KEY),
  });
});

app.get('/api/products', (req, res) => res.json(products));

app.post('/api/assistant', wrap(async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message) throw fail(400, 'Tell the assistant what you are looking for.');
  res.json(await askAssistant(message, products));
}));

// Step 1: create the PayPal order. The total is calculated here, never in the browser.
app.post('/api/paypal/create-order', wrap(async (req, res) => {
  const { lines, totalCents } = priceCart(req.body.items);
  const id = await paypal.createOrder(totalCents, 'Kiln & Co order');
  pending.set(id, { lines, totalCents });
  res.json({ id });
}));

// Step 2: after the buyer approves, capture the payment and save the order.
app.post('/api/paypal/capture-order/:orderId', wrap(async (req, res) => {
  const cart = pending.get(req.params.orderId);
  if (!cart) throw fail(400, 'This order was not found. Please try again.');
  const data = await paypal.captureOrder(req.params.orderId);
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (data.status === 'COMPLETED') {
    pending.delete(req.params.orderId);
    await orders.saveOrder({
      paypalOrderId: data.id,
      captureId: capture?.id,
      status: data.status,
      payerEmail: data.payer?.email_address,
      items: cart.lines,
      total: cart.totalCents / 100,
      currency: 'USD',
    });
  }
  res.json({ id: data.id, status: data.status, total: cart.totalCents / 100 });
}));

app.get('/api/orders', wrap(async (req, res) => {
  if (!process.env.ADMIN_KEY || req.query.key !== process.env.ADMIN_KEY) throw fail(401, 'Wrong admin key.');
  res.json(await orders.listOrders());
}));

app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : err.message || 'Something went wrong.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Kiln & Co is running at http://localhost:${port}`));
