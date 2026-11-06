// Saves orders to MongoDB if MONGODB_URI is set, otherwise to data/orders.json.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'orders.json');
let modelPromise = null;

function getModel() {
  if (!process.env.MONGODB_URI) return null;
  if (!modelPromise) {
    modelPromise = (async () => {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI);
      const schema = new mongoose.Schema(
        {
          paypalOrderId: String,
          captureId: String,
          status: String,
          payerEmail: String,
          items: [{ id: Number, name: String, price: Number, qty: Number }],
          total: Number,
          currency: String,
        },
        { timestamps: true }
      );
      return mongoose.models.Order || mongoose.model('Order', schema);
    })();
  }
  return modelPromise;
}

function readFile() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}

async function saveOrder(order) {
  const Model = getModel();
  if (Model) return (await Model).create(order);
  const all = readFile();
  all.push({ ...order, createdAt: new Date().toISOString() });
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
  return order;
}

async function listOrders() {
  const Model = getModel();
  if (Model) return (await Model).find().sort({ createdAt: -1 }).limit(100).lean();
  return readFile().reverse();
}

module.exports = { saveOrder, listOrders };
