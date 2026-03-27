import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@alphacomputers.co.ke' },
    update: {},
    create: {
      email: 'admin@alphacomputers.co.ke',
      name: 'Alpha Admin',
      password: adminPassword,
      phone: '+254700000000',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // Test customer
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      name: 'Test Customer',
      password: customerPassword,
      phone: '+254711111111',
      role: 'CUSTOMER',
    },
  });
  console.log(`✅ Customer: ${customer.email}`);

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
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, specs: p.specs as any },
    });
  }
  console.log(`✅ ${products.length} products seeded`);

  console.log('🎉 Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin:    admin@alphacomputers.co.ke / admin123');
  console.log('  Customer: customer@test.com / customer123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
