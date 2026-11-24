import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Staff accounts. Passwords come from the environment; if unset a random one is
  // generated and printed ONCE. There are no default/known passwords.
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@alphacomputers.co.ke').toLowerCase();
  const adminPlain = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString('base64url');
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Alpha Admin',
      password: await bcrypt.hash(adminPlain, 12),
      role: 'ADMIN',
    },
  });
  console.log(`Admin: ${admin.email}`);

  const invEmail = (process.env.SEED_INVENTORY_EMAIL || 'inventory@alphacomputers.co.ke').toLowerCase();
  const invPlain = process.env.SEED_INVENTORY_PASSWORD || randomBytes(9).toString('base64url');
  const inventoryUser = await prisma.user.upsert({
    where: { email: invEmail },
    update: {},
    create: {
      email: invEmail,
      name: 'Inventory Manager',
      password: await bcrypt.hash(invPlain, 12),
      role: 'INVENTORY',
    },
  });
  console.log(`Inventory: ${inventoryUser.email}`);

  // Settings
  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {
        companyName: 'Alpha Computers Nanyuki',
        contactEmail: 'info@alphacomputersnanyuki.co.ke',
        whatsappNumber: '+254700000000',
        locationLat: -0.0167,
        locationLng: 37.0667,
        address: 'Kenyatta Avenue, Nanyuki Town, Laikipia County, Kenya',
      },
    });
    console.log('✅ Settings seeded');
  }

  // Starter delivery zone. Edit the fee and areas in Admin > Delivery zones; an address that matches no zone
  // is flagged so the office can agree a fee with the customer before approving.
  if ((await prisma.deliveryZone.count()) === 0) {
    await prisma.deliveryZone.create({
      data: { name: 'Nanyuki Town', fee: 200, areas: ['nanyuki', 'nanyuki town', 'town'], estimatedDays: 'Same day', sortOrder: 0 },
    });
    console.log('Starter delivery zone created');
  }

  // Sample products
  const products = [
    {
      name: 'ASUS ROG Strix G16',
      sku: 'LAP-001',
      brand: 'ASUS',
      category: 'Laptops',
      condition: 'New',
      price: 185000,
      stock: 5,
      summary: '16" Gaming Laptop, Intel i9, RTX 4070, 32GB RAM',
      description: 'The ASUS ROG Strix G16 is a powerhouse gaming laptop built for serious gamers.',
      images: ['https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&h=600&fit=crop'],
      specs: [
        { label: 'Processor', value: 'Intel Core i9-13980HX' },
        { label: 'RAM', value: '32GB DDR5' },
        { label: 'Storage', value: '1TB NVMe SSD' },
      ],
      rating: 5,
    },
    {
      name: 'Dell XPS 13 Plus',
      sku: 'LAP-002',
      brand: 'Dell',
      category: 'Laptops',
      condition: 'New',
      price: 145000,
      stock: 3,
      summary: 'Ultra-portable, 13.4" OLED, Intel i7, 16GB',
      description: 'The Dell XPS 13 Plus redefines ultra-portable computing.',
      images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop'],
      specs: [
        { label: 'Processor', value: 'Intel Core i7-1360P' },
        { label: 'RAM', value: '16GB LPDDR5' },
        { label: 'Display', value: '13.4" OLED 3.5K' },
      ],
      rating: 5,
    },
    {
      name: 'HP ProDesk 400 G9',
      sku: 'DES-001',
      brand: 'HP',
      category: 'Desktops',
      condition: 'New',
      price: 95000,
      stock: 4,
      summary: 'Business desktop, i5-12500, 8GB, 256GB SSD',
      description: 'Reliable business desktop for everyday productivity.',
      images: ['https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=800&h=600&fit=crop'],
      specs: [
        { label: 'Processor', value: 'Intel Core i5-12500' },
        { label: 'RAM', value: '8GB DDR4' },
        { label: 'Storage', value: '256GB SSD' },
      ],
      rating: 4,
    },
    {
      name: 'Samsung 27" Curved Monitor',
      sku: 'MON-001',
      brand: 'Samsung',
      category: 'Monitors',
      condition: 'New',
      price: 32000,
      stock: 8,
      summary: '27" QHD 144Hz curved gaming monitor',
      description: 'Immersive curved QHD gaming monitor with 144Hz refresh rate.',
      images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&h=600&fit=crop'],
      specs: [
        { label: 'Size', value: '27" Curved' },
        { label: 'Resolution', value: '2560x1440 QHD' },
        { label: 'Refresh Rate', value: '144Hz' },
      ],
      rating: 4,
    },
    {
      name: 'Intel Core i7-13700K',
      sku: 'PCP-001',
      brand: 'Intel',
      category: 'PC Parts',
      condition: 'New',
      price: 28000,
      stock: 10,
      summary: '13th Gen, 16 cores, 5.4GHz boost, LGA1700',
      description: 'Powerhouse desktop processor for gaming and content creation.',
      images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop'],
      specs: [
        { label: 'Cores', value: '16 (8P+8E)' },
        { label: 'Boost Clock', value: '5.4GHz' },
        { label: 'Socket', value: 'LGA1700' },
      ],
      rating: 5,
    },
    {
      name: 'Universal Laptop Battery 65Wh',
      sku: 'LPT-001',
      brand: 'Generic',
      category: 'Laptop Parts',
      condition: 'New',
      price: 3500,
      stock: 30,
      summary: 'Compatible with HP, Dell, Lenovo — 65Wh Li-ion',
      description: 'High-capacity replacement laptop battery with protection circuits.',
      images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop'],
      specs: [
        { label: 'Capacity', value: '65Wh' },
        { label: 'Type', value: 'Li-ion' },
        { label: 'Warranty', value: '6 Months' },
      ],
      rating: 4,
    },
  ];

  for (const p of products) {
    const exists = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (exists) continue;
    const { stock, ...rest } = p;
    const created = await prisma.product.create({ data: { ...rest, stock, specs: rest.specs as any } });
    // opening stock goes in the ledger so movements always reconcile with stock
    await prisma.stockMovement.create({
      data: { productId: created.id, type: 'RECEIVED', quantity: stock, stockBefore: 0, stockAfter: stock, reason: 'Opening stock', userId: admin.id },
    });
  }
  console.log(`✅ ${products.length} products seeded`);

  console.log('🎉 Seed complete!');
  if (!process.env.SEED_ADMIN_PASSWORD) console.log(`\nGenerated admin password (shown once, change it): ${adminPlain}`);
  if (!process.env.SEED_INVENTORY_PASSWORD) console.log(`Generated inventory password (shown once, change it): ${invPlain}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
