import { randomUUID } from 'crypto';
const A = process.env.API || 'http://localhost:3000/api';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const call = async (m, p, b, t) => {
  const r = await fetch(A + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined });
  let j; try { j = await r.json(); } catch { j = null; } return { s: r.status, j };
};
const login = async (e, p) => (await call('POST', '/auth/login', { email: e, password: p })).j.access_token;
const code = () => Array.from({ length: 10 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const at = await login('admin@alphacomputers.co.ke', (process.env.AP || process.env.SEED_ADMIN_PASSWORD));
const it = await login('inventory@alphacomputers.co.ke', (process.env.IP || process.env.SEED_INVENTORY_PASSWORD));
const products = (await call('GET', '/products')).j;
const prod = products.find(p => p.stock >= 8);
const zone = (await call('GET', '/zones')).j[0];
const PHONE = '0712345678';
const base = { customerName: 'Refund Tester', customerPhone: PHONE, fulfillmentMode: 'DELIVERY', deliveryZoneId: zone.id, deliveryAddress: 'Kenyatta Ave, Nanyuki' };

// place an order, run it all the way to the customer's hands
async function deliveredOrder(method, qty) {
  const o = (await call('POST', '/orders', { ...base, paymentMethod: method, items: [{ productId: prod.id, quantity: qty }] })).j;
  const id = (await call('GET', '/orders?search=' + o.orderNumber, null, at)).j[0].id;
  if (method === 'MPESA_MANUAL') {
    await call('POST', '/orders/payment-reference', { orderNumber: o.orderNumber, phone: PHONE, code: code() });
    await call('POST', `/orders/${id}/verify-payment`, {}, at);
  }
  await call('POST', `/orders/${id}/approve`, {}, at);
  const item = (await call('GET', '/orders/' + id, null, at)).j.items[0].id;
  await call('POST', `/orders/items/${item}/source`, { source: 'warehouse', quantity: qty }, it);
  await call('POST', `/orders/${id}/start-packing`, {}, it);
  await call('POST', `/orders/items/${item}/check`, { checked: true }, it);
  await call('POST', `/orders/${id}/mark-packed`, {}, it);
  await call('POST', `/orders/${id}/dispatch`, { riderName: 'Rider', riderPhone: '0733444555' }, it);
  return { o, id, item };
}
const requestReturn = async (o, qty, extra = {}) => {
  const elig = (await call('GET', `/returns/eligibility?orderNumber=${o.orderNumber}&phone=${PHONE}`)).j;
  const line = elig.items[0];
  return call('POST', '/returns', { orderNumber: o.orderNumber, phone: PHONE, items: [{ orderItemId: line.orderItemId, quantity: qty }], reason: 'Not as described', requestRef: randomUUID(), ...extra });
};
const stockOf = async () => (await call('GET', '/inventory/stock', null, it)).j.find(p => p.id === prod.id).stock;

console.log('\n[1] paid order, delivered, customer asks to exchange');
const A1 = await deliveredOrder('MPESA_MANUAL', 2);
await call('POST', `/orders/${A1.id}/complete`, {}, at);
const total = (await call('GET', '/orders/' + A1.id, null, at)).j.totalAmount;
let r = await requestReturn(A1.o, 1, { resolution: 'EXCHANGE' });
ok(r.s === 201 && r.j.resolution === 'EXCHANGE', 'customer can choose exchange instead of refund');
const ret1 = r.j.id;
r = await call('POST', `/returns/${ret1}/refund`, { amount: 100 }, at);
ok(r.s === 400 && /Approve the return/.test(r.j.message), 'cannot refund before the office approves: ' + r.j.message);
await call('POST', `/returns/${ret1}/decision`, { approve: true }, at);

console.log('\n[2] refund guard rails');
let d = (await call('GET', '/returns/' + ret1, null, at)).j;
ok(d.refund.paid && d.refund.canRefund && d.refund.suggested === prod.price, `suggested refund = value of returned goods (${d.refund.suggested})`);
ok(d.refund.maxRefundable === total, 'max refundable = order total');
r = await call('POST', `/returns/${ret1}/refund`, { amount: total + 1 }, at);
ok(r.s === 400 && /cannot be more/.test(r.j.message), 'cannot refund more than was paid');
r = await call('POST', `/returns/${ret1}/refund`, { amount: 0 }, at);
ok(r.s === 400, 'zero refund rejected');
r = await call('POST', `/returns/${ret1}/refund`, { amount: 100 }, it);
ok(r.s === 403, 'inventory cannot record refunds');
r = await call('POST', `/returns/${ret1}/refund`, { amount: d.refund.suggested, note: 'Sent by M-Pesa', reference: 'qwe4r5t6y7' }, at);
ok(r.s === 201 && r.j.status === 'REFUNDED' && r.j.refundedAt && r.j.refundReference === 'QWE4R5T6Y7', 'refund recorded: status REFUNDED, timestamp, reference upper-cased');
r = await call('POST', `/returns/${ret1}/refund`, { amount: 50 }, at);
ok(r.s === 400 && /already/.test(r.j.message), 'a return cannot be refunded twice');

console.log('\n[3] goods can still come back after the refund');
const before = await stockOf();
d = (await call('GET', '/returns/' + ret1, null, at)).j;
r = await call('POST', `/returns/${ret1}/inspect`, { items: [{ returnItemId: d.items[0].id, receivedQuantity: 1, sellableQuantity: 1 }] }, it);
ok(r.s === 201 && r.j.status === 'REFUNDED' && r.j.items[0].restocked === 1, 'inspected after refund: stays REFUNDED, 1 restocked');
ok((await stockOf()) === before + 1, 'sellable unit went back on the shelf');

console.log('\n[4] cumulative limit across returns on one order');
r = await requestReturn(A1.o, 1);
const ret2 = r.j.id;
await call('POST', `/returns/${ret2}/decision`, { approve: true }, at);
d = (await call('GET', '/returns/' + ret2, null, at)).j;
ok(d.refund.alreadyRefundedOnOrder === prod.price && d.refund.maxRefundable === total - prod.price, 'second return sees what was already refunded');
r = await call('POST', `/returns/${ret2}/refund`, { amount: total - prod.price + 1 }, at);
ok(r.s === 400, 'second refund cannot push the order past its total');
r = await call('POST', `/returns/${ret2}/refund`, { amount: d.refund.suggested }, at);
ok(r.s === 201, 'second refund within the remaining amount accepted');
const view = (await call('GET', `/orders/track?orderNumber=${A1.o.orderNumber}&phone=${PHONE}`)).j;
ok(view.refundedAmount === prod.price * 2, `customer sees total refunded (KES ${view.refundedAmount})`);
const notes = (await call('GET', '/orders/' + A1.id, null, at)).j.notifications.filter(n => n.milestone.startsWith('refund_recorded'));
ok(notes.length === 4 && new Set(notes.map(n => n.milestone)).size === 2, 'customer notified once per refund per channel (2 refunds x 2 channels)');

console.log('\n[5] unpaid order: nothing to refund');
const B = await deliveredOrder('CASH', 1);
r = await call('POST', `/orders/${B.id}/failed-delivery`, { note: 'Customer unreachable' }, at);
const retB = (await call('GET', '/returns', null, at)).j.find(x => x.orderNumber === B.o.orderNumber);
d = (await call('GET', '/returns/' + retB.id, null, at)).j;
ok(d.refund.canRefund === false && /no payment was collected/.test(d.refund.blockedReason), 'COD order never collected: refund blocked with a clear reason');
r = await call('POST', `/returns/${retB.id}/refund`, { amount: 100 }, at);
ok(r.s === 400 && /No refund is needed/.test(r.j.message), 'server refuses a refund when no money was received');

console.log('\n[6] two returns racing to over-refund one order');
const C = await deliveredOrder('MPESA_MANUAL', 2);
await call('POST', `/orders/${C.id}/complete`, {}, at);
const totalC = (await call('GET', '/orders/' + C.id, null, at)).j.totalAmount;
const c1 = (await requestReturn(C.o, 1)).j.id; const c2 = (await requestReturn(C.o, 1)).j.id;
await call('POST', `/returns/${c1}/decision`, { approve: true }, at); await call('POST', `/returns/${c2}/decision`, { approve: true }, at);
const each = Math.round(totalC * 0.6);
const res = await Promise.all([call('POST', `/returns/${c1}/refund`, { amount: each }, at), call('POST', `/returns/${c2}/refund`, { amount: each }, at)]);
const wins = res.filter(x => x.s === 201).length;
ok(wins === 1, `exactly one of two simultaneous 60% refunds succeeded (${res.map(x => x.s).join(', ')})`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
