'use strict';

// E-commerce skin: a multi-merchant seller dashboard.
// Sensitive objects: customers (PII + partial card), orders, documents.
module.exports = {
  key: 'ecommerce',
  brand: 'ShopLab Seller',
  tagline: 'Order & customer dashboard for merchants',
  terms: {
    org: 'Store',
    orgPlural: 'Stores',
    record: 'Order',
    recordPlural: 'Orders',
    recordPrefix: 'ORD',
    document: 'Invoice',
    account: 'Customer',
    team: 'Staff',
  },
  taglinePt: 'Painel de pedidos e clientes para lojistas',
  termsPt: {
    org: 'Loja', orgPlural: 'Lojas',
    record: 'Pedido', recordPlural: 'Pedidos', recordPrefix: 'ORD',
    document: 'Fatura', account: 'Cliente', team: 'Equipe',
  },
  orgs: [
    { name: 'Acme Outfitters', slug: 'acme', plan: 'enterprise' },
    { name: 'Globex Gadgets', slug: 'globex', plan: 'growth' },
    { name: 'Initech Supplies', slug: 'initech', plan: 'starter' },
  ],
  profile(u) {
    return {
      title: 'Store Operator',
      phone: `+1-718-555-0${100 + u.seq}`,
      shippingAddress: `${100 + u.seq * 7} Market St, Unit ${u.seq}, Brooklyn, NY`,
      cardLast4: String(4000 + u.seq * 111).slice(-4),
      loyaltyTier: ['bronze', 'silver', 'gold', 'platinum'][u.seq % 4],
    };
  },
  record(r) {
    return {
      kind: 'order',
      counterparty: r.counterparty,
      amount: r.amount,
      currency: 'USD',
      memo: `Order for ${r.counterparty} — 3 items, ships ground.`,
    };
  },
  documentTitle: (seq) => `Packing slip & customer invoice #${seq}`,
};
