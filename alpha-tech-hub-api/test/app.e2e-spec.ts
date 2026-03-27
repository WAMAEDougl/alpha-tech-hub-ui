/**
 * Alpha Computers Nanyuki — End-to-End Test Suite
 *
 * Tests every API module in sequence:
 * Auth → Settings → Products → Cart → Orders → Repairs → Payments → Analytics → Reports
 *
 * Run: npm run test:e2e
 * Requires: TEST_DATABASE_URL in .env.test
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Alpha Computers API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Tokens & IDs shared across tests
  let adminToken: string;
  let customerToken: string;
  let productId: string;
  let orderId: string;
  let repairTicketId: string;
  let repairTicketNumber: string;

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Clean test data
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.repairTicket.deleteMany();
    await prisma.buildRequest.deleteMany();
    await prisma.disposalRequest.deleteMany();
    await prisma.quoteRequest.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: '@e2e.test' } } });
  });

  afterAll(async () => {
    await app.close();
  });

  // ── 1. AUTH ────────────────────────────────────────────────────────────────

  describe('Auth Module', () => {
    it('POST /auth/register — registers a new customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'customer@e2e.test',
          name: 'E2E Customer',
          password: 'password123',
          phone: '+254700000001',
        })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.role).toBe('CUSTOMER');
      customerToken = res.body.access_token;
    });

    it('POST /auth/register — registers an admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@e2e.test',
          name: 'E2E Admin',
          password: 'admin123',
          phone: '+254700000002',
          role: 'ADMIN',
        })
        .expect(201);

      adminToken = res.body.access_token;
    });

    it('POST /auth/register — rejects duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'customer@e2e.test', name: 'Dup', password: 'pass123' })
        .expect(409);
    });

    it('POST /auth/login — returns token for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'customer@e2e.test', password: 'password123' })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
    });

    it('POST /auth/login — rejects wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'customer@e2e.test', password: 'wrongpass' })
        .expect(401);
    });

    it('GET /auth/me — returns current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.email).toBe('customer@e2e.test');
      expect(res.body.password).toBeUndefined();
    });

    it('GET /auth/me — rejects unauthenticated request', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  // ── 2. SETTINGS ────────────────────────────────────────────────────────────

  describe('Settings Module', () => {
    it('GET /settings — returns settings (public)', async () => {
      const res = await request(app.getHttpServer()).get('/settings').expect(200);
      expect(res.body.companyName).toBeDefined();
    });

    it('PATCH /settings — admin can update settings', async () => {
      const res = await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ companyName: 'Alpha Computers E2E', contactEmail: 'test@e2e.test' })
        .expect(200);

      expect(res.body.companyName).toBe('Alpha Computers E2E');
    });

    it('PATCH /settings — customer cannot update settings', () => {
      return request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ companyName: 'Hacked' })
        .expect(403);
    });
  });

  // ── 3. PRODUCTS ────────────────────────────────────────────────────────────

  describe('Products Module', () => {
    it('POST /products — admin creates a product', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Laptop',
          sku: 'E2E-LAP-001',
          brand: 'TestBrand',
          category: 'Laptops',
          price: 50000,
          stock: 10,
          summary: 'Test laptop for E2E',
          description: 'A laptop used in E2E testing',
          images: ['https://example.com/img.jpg'],
          specs: [{ label: 'RAM', value: '8GB' }],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('E2E Test Laptop');
      productId = res.body.id;
    });

    it('POST /products — customer cannot create product', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Hack', sku: 'HACK-001', brand: 'X', category: 'Laptops', price: 1, stock: 1 })
        .expect(403);
    });

    it('GET /products — lists all active products', async () => {
      const res = await request(app.getHttpServer()).get('/products').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /products?category=Laptops — filters by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/products?category=Laptops')
        .expect(200);
      res.body.forEach((p: any) => expect(p.category).toBe('Laptops'));
    });

    it('GET /products/:id — returns single product', async () => {
      const res = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);
      expect(res.body.id).toBe(productId);
    });

    it('GET /products/:id — returns 404 for unknown id', () => {
      return request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('PATCH /products/:id — admin updates product', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 55000, stock: 8 })
        .expect(200);
      expect(Number(res.body.price)).toBe(55000);
    });
  });

  // ── 4. CART ────────────────────────────────────────────────────────────────

  describe('Cart Module', () => {
    it('GET /cart — returns empty cart initially', async () => {
      const res = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      expect(res.body.items).toHaveLength(0);
      expect(res.body.subtotal).toBe(0);
    });

    it('POST /cart/items — adds item to cart', async () => {
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 2 })
        .expect(201);
    });

    it('GET /cart — shows added item', async () => {
      const res = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(2);
      expect(res.body.subtotal).toBeGreaterThan(0);
    });

    it('POST /cart/items — rejects quantity exceeding stock', () => {
      return request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 9999 })
        .expect(400);
    });

    it('PATCH /cart/items/:productId — updates quantity', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/cart/items/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 1 })
        .expect(200);
      expect(res.body.items[0].quantity).toBe(1);
    });
  });

  // ── 5. ORDERS ──────────────────────────────────────────────────────────────

  describe('Orders Module', () => {
    it('POST /orders/checkout — creates order from cart', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentMethod: 'PAY_ON_DELIVERY',
          deliveryAddress: 'Kenyatta Ave, Nanyuki',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('PENDING');
      expect(res.body.items).toHaveLength(1);
      orderId = res.body.id;
    });

    it('POST /orders/checkout — rejects empty cart', () => {
      return request(app.getHttpServer())
        .post('/orders/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'PAY_ON_DELIVERY' })
        .expect(400);
    });

    it('GET /orders — customer sees own orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].userId).toBeDefined();
    });

    it('GET /orders/:id — customer can view own order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      expect(res.body.id).toBe(orderId);
    });

    it('PATCH /orders/:id/status — admin transitions PENDING → PAID', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PAID' })
        .expect(200);
      expect(res.body.status).toBe('PAID');
    });

    it('PATCH /orders/:id/status — rejects invalid transition PAID → DELIVERED', () => {
      return request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DELIVERED' })
        .expect(400);
    });

    it('PATCH /orders/:id/status — admin transitions PAID → PROCESSING', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PROCESSING' })
        .expect(200);
      expect(res.body.status).toBe('PROCESSING');
    });
  });

  // ── 6. REPAIRS ─────────────────────────────────────────────────────────────

  describe('Repairs Module', () => {
    it('POST /repairs — submits a repair booking (public)', async () => {
      const res = await request(app.getHttpServer())
        .post('/repairs')
        .send({
          customerName: 'E2E Customer',
          customerPhone: '+254700000001',
          customerEmail: 'customer@e2e.test',
          deviceBrand: 'HP',
          deviceModel: 'Pavilion 15',
          issueDescription: 'Screen cracked',
          serviceType: 'Screen Replacement',
        })
        .expect(201);

      expect(res.body.ticketNumber).toMatch(/^SVC-\d{4}$/);
      repairTicketId = res.body.id;
      repairTicketNumber = res.body.ticketNumber;
    });

    it('GET /repairs/track/:ticketNumber — customer tracks repair (public)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/repairs/track/${repairTicketNumber}`)
        .expect(200);

      expect(res.body.ticketNumber).toBe(repairTicketNumber);
      expect(res.body.status).toBe('RECEIVED');
    });

    it('GET /repairs/track/:ticketNumber — returns 404 for unknown ticket', () => {
      return request(app.getHttpServer())
        .get('/repairs/track/SVC-9999')
        .expect(404);
    });

    it('GET /repairs — admin lists all tickets', async () => {
      const res = await request(app.getHttpServer())
        .get('/repairs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('PATCH /repairs/:id — admin updates ticket status and technician', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/repairs/${repairTicketId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'DIAGNOSTIC',
          technician: 'Evans',
          technicianNotes: 'Screen confirmed cracked. Ordering replacement.',
          estimatedCost: 6500,
        })
        .expect(200);

      expect(res.body.status).toBe('DIAGNOSTIC');
      expect(res.body.technician).toBe('Evans');
    });

    it('PATCH /repairs/:id — customer cannot update ticket', () => {
      return request(app.getHttpServer())
        .patch(`/repairs/${repairTicketId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'COMPLETED' })
        .expect(403);
    });
  });

  // ── 7. BUILD REQUESTS ──────────────────────────────────────────────────────

  describe('Build Requests Module', () => {
    it('POST /build-requests — submits a build request (public)', async () => {
      const res = await request(app.getHttpServer())
        .post('/build-requests')
        .send({
          name: 'E2E Builder',
          phone: '+254700000003',
          buildType: 'Gaming PC',
          budget: 'KES 100,000 – 200,000',
          useCases: ['Gaming', 'Streaming'],
          notes: 'Need RGB lighting',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('New');
    });

    it('GET /build-requests — admin lists all requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/build-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── 8. DISPOSAL REQUESTS ───────────────────────────────────────────────────

  describe('Disposal Module', () => {
    it('POST /disposal — submits a disposal request (public)', async () => {
      const res = await request(app.getHttpServer())
        .post('/disposal')
        .send({
          name: 'E2E Disposer',
          phone: '+254700000004',
          items: '2 old laptops, 1 desktop',
          quantity: 3,
          preferredDate: '2026-04-15',
        })
        .expect(201);

      expect(res.body.status).toBe('Pending');
    });

    it('GET /disposal — admin lists all requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/disposal')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── 9. QUOTES ──────────────────────────────────────────────────────────────

  describe('Quotes Module', () => {
    it('POST /quotes — submits a quick quote (public)', async () => {
      const res = await request(app.getHttpServer())
        .post('/quotes')
        .send({
          name: 'E2E Quoter',
          phone: '+254700000005',
          interest: 'Gaming laptop under KES 150,000',
          message: 'Need it by end of month',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
    });

    it('GET /quotes — admin lists all quotes', async () => {
      const res = await request(app.getHttpServer())
        .get('/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── 10. ANALYTICS ──────────────────────────────────────────────────────────

  describe('Analytics Module', () => {
    it('GET /analytics/dashboard — admin gets dashboard stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.revenue).toBeDefined();
      expect(res.body.repairs).toBeDefined();
      expect(res.body.products).toBeDefined();
      expect(res.body.customers).toBeDefined();
      expect(res.body.repairs.activeTickets).toBeGreaterThan(0);
    });

    it('GET /analytics/dashboard — customer cannot access', () => {
      return request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  // ── 11. USERS ──────────────────────────────────────────────────────────────

  describe('Users Module', () => {
    it('GET /users — admin lists all users', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /users — customer cannot list users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  // ── 12. VALIDATION ─────────────────────────────────────────────────────────

  describe('Validation (class-validator)', () => {
    it('POST /auth/register — rejects invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', name: 'Test', password: 'pass123' })
        .expect(400);
    });

    it('POST /auth/register — rejects short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'valid@test.com', name: 'Test', password: '123' })
        .expect(400);
    });

    it('POST /products — rejects missing required fields', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Incomplete' })
        .expect(400);
    });

    it('POST /repairs — rejects missing required fields', () => {
      return request(app.getHttpServer())
        .post('/repairs')
        .send({ customerName: 'Only Name' })
        .expect(400);
    });
  });
});
