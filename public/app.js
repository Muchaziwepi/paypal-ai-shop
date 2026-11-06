
const $ = (id) => document.getElementById(id);
const money = (n) => '$' + Number(n).toFixed(2);

let products = [];
let activeCategory = 'All';
let searchTerm = '';
const cart = new Map();

async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

function setStatus(text, kind) {
  const el = $('status');
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

function renderCategoryFilters() {
  const categories = ['All', ...new Set(products.map(p => p.category))];
  const box = $('category-filters');
  box.innerHTML = '';
  categories.forEach(category => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter' + (category === activeCategory ? ' active' : '');
    btn.textContent = category;
    btn.setAttribute('aria-pressed', String(category === activeCategory));
    btn.onclick = () => { activeCategory = category; renderCategoryFilters(); renderProducts(); };
    box.appendChild(btn);
  });
}

function makeProductVisual(p) {
  const stage = document.createElement('div');
  stage.className = 'product-visual';
  if (p.image) {
    const img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name + ' product image';
    img.loading = 'lazy';
    img.onerror = () => {
      stage.classList.add('visual-fallback');
      img.remove();
      const pack = document.createElement('div');
      pack.className = 'pack-fallback';
      const brand = document.createElement('span');
      brand.textContent = p.name.split(' ').slice(0, 2).join(' ');
      const name = document.createElement('strong');
      name.textContent = p.name;
      pack.append(brand, name);
      stage.appendChild(pack);
    };
    stage.appendChild(img);
  } else {
    stage.classList.add('visual-fallback');
    const pack = document.createElement('div');
    pack.className = 'pack-fallback';
    const brand = document.createElement('span');
    brand.textContent = p.name.split(' ').slice(0, 2).join(' ');
    const name = document.createElement('strong');
    name.textContent = p.name;
    pack.append(brand, name);
    stage.appendChild(pack);
  }
  return stage;
}

function renderProducts() {
  const box = $('products');
  box.innerHTML = '';
  const visible = products.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    (searchTerm === '' || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(searchTerm))
  );
  $('result-count').textContent = `${visible.length} products`;
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-results';
    empty.textContent = 'No products match that search. Try another name or category.';
    box.appendChild(empty);
    return;
  }
  visible.forEach(p => {
    const tile = document.createElement('article');
    tile.className = 'tile';
    const visual = makeProductVisual(p);
    const meta = document.createElement('div');
    meta.className = 'product-meta';
    const category = document.createElement('span');
    category.className = 'category-label';
    category.textContent = p.category;
    const size = document.createElement('span');
    size.className = 'size-label';
    size.textContent = p.size || '';
    meta.append(category, size);
    const name = document.createElement('h3');
    name.textContent = p.name;
    const desc = document.createElement('p');
    desc.className = 'description';
    desc.textContent = p.description;
    const sourceLine = document.createElement('p');
    sourceLine.className = 'source-line';
    if (p.productUrl) {
      const sourceLink = document.createElement('a');
      sourceLink.href = p.productUrl;
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener noreferrer';
      sourceLink.textContent = 'Product / price reference ↗';
      sourceLine.appendChild(sourceLink);
    } else {
      sourceLine.textContent = p.priceSource || 'Retail price reference';
    }
    const row = document.createElement('div');
    row.className = 'row';
    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = money(p.price);
    const add = document.createElement('button');
    add.className = 'add';
    add.textContent = 'Add to cart';
    add.onclick = () => addToCart(p.id, 1);
    row.append(price, add);
    tile.append(visual, meta, name, desc, sourceLine, row);
    box.appendChild(tile);
  });
}

$('product-search').addEventListener('input', e => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderProducts();
});

function addToCart(id, qty) {
  cart.set(id, Math.min(10, (cart.get(id) || 0) + qty));
  renderCart();
}
function changeQty(id, delta) {
  const next = (cart.get(id) || 0) + delta;
  if (next <= 0) cart.delete(id);
  else cart.set(id, Math.min(10, next));
  renderCart();
}
function renderCart() {
  const box = $('cart-items');
  box.innerHTML = '';
  if (cart.size === 0) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Your cart is empty. Find something you need on the shelf.';
    box.appendChild(p);
  }
  let total = 0;
  cart.forEach((qty, id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    total += p.price * qty;
    const line = document.createElement('div');
    line.className = 'line';
    const label = document.createElement('span');
    label.textContent = p.name;
    const sum = document.createElement('span');
    sum.textContent = money(p.price * qty);
    const controls = document.createElement('span');
    controls.className = 'qty';
    const minus = document.createElement('button');
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Remove one ' + p.name);
    minus.onclick = () => changeQty(id, -1);
    const count = document.createElement('span');
    count.textContent = qty;
    const plus = document.createElement('button');
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Add one ' + p.name);
    plus.onclick = () => changeQty(id, 1);
    controls.append(minus, count, plus);
    line.append(label, sum, controls);
    box.appendChild(line);
  });
  $('total').textContent = money(total);
}

$('assistant').addEventListener('submit', async e => {
  e.preventDefault();
  const message = $('ask-input').value.trim();
  if (!message) return;
  const btn = $('ask-btn');
  btn.disabled = true;
  $('assistant-reply').textContent = 'Finding products for you...';
  try {
    const data = await api('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    data.picks.forEach(pick => addToCart(pick.id, pick.qty));
    $('assistant-reply').textContent = data.reply;
  } catch (err) {
    $('assistant-reply').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// PayPal sandbox checkout. The server remains the source of truth for prices.
async function createOrder() {
  const items = [...cart].map(([id, qty]) => ({ id, qty }));
  if (!items.length) throw new Error('empty-cart');
  const data = await api('/api/paypal/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return { orderId: data.id };
}
async function onApprove(data) {
  setStatus('Confirming your payment...');
  try {
    const result = await api('/api/paypal/capture-order/' + data.orderId, { method: 'POST' });
    if (result.status === 'COMPLETED') {
      setStatus('Payment complete: ' + money(result.total) + '. Order ' + result.id, 'ok');
      cart.clear();
      renderCart();
    } else setStatus('Payment status: ' + result.status + '. It was not completed.', 'err');
  } catch (err) { setStatus(err.message, 'err'); }
}
async function onPayPalWebSdkLoaded() {
  try {
    const config = await api('/api/config');
    if (!config.paypalConfigured) {
      setStatus('Add your PayPal sandbox keys to .env, then restart the server.', 'err');
      return;
    }
    const sdk = await window.paypal.createInstance({
      clientId: config.clientId, components: ['paypal-payments'], pageType: 'checkout',
    });
    const methods = await sdk.findEligibleMethods({ currencyCode: 'USD' });
    if (!methods.isEligible('paypal')) { setStatus('PayPal is not available right now.', 'err'); return; }
    const session = sdk.createPayPalOneTimePaymentSession({
      onApprove,
      onCancel: () => setStatus('Payment cancelled. Your cart is still here.'),
      onError: err => { console.error(err); setStatus('PayPal reported an error. Please try again.', 'err'); },
    });
    const btn = $('paypal-button');
    btn.removeAttribute('hidden');
    btn.addEventListener('click', async () => {
      setStatus('');
      try { await session.start({ presentationMode: 'auto' }, createOrder()); }
      catch (err) {
        console.error(err);
        setStatus(err.message === 'empty-cart' ? 'Add something to your cart first.' : err.message, 'err');
      }
    });
  } catch (err) {
    console.error('PayPal setup failed', err);
    setStatus('Could not load PayPal. Check the browser console (F12).', 'err');
  }
}
(async function init() {
  try {
    products = await api('/api/products');
    renderCategoryFilters();
    renderProducts();
    renderCart();
  } catch (err) { setStatus(err.message, 'err'); }
})();
