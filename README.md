# Alpha Computers Nanyuki — Web Platform

A full-featured e-commerce and service management platform for **Alpha Computers Nanyuki**, a technology hub based in Nanyuki, Kenya. Built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.

---

## Live Features

### Customer-Facing

| Section | Description |
|---|---|
| **Hero Slideshow** | 5-image auto-playing background with staggered text animations |
| **Product Catalog** | Filter by category (Laptops, Desktops, Accessories, Monitors, PC Parts, Laptop Parts), price range, brand and condition |
| **Product Detail Page** | Image gallery with thumbnails, full description, specs table, quantity selector, Add to Cart |
| **PC Components** | Dedicated section for desktop PC parts (CPUs, GPUs, RAM, SSDs, motherboards) |
| **Laptop Spare Parts** | Dedicated section for laptop parts (batteries, screens, keyboards, chargers, fans) |
| **Services** | Book any repair service (Hardware Diagnostic, OS Install, Data Recovery, Network Setup, Virus Removal, Screen Replacement) with a ticket system |
| **Repair Tracker** | Enter a ticket number to see real-time status, technician, estimated cost and notes |
| **Custom PC Builds** | 4-step form — build type, budget range, use cases, contact details — submits a build request to admin |
| **E-Waste Disposal** | Schedule a drop-off for old electronics with secure data destruction and eco-friendly recycling |
| **About Us** | Company story, stats (years, customers, repairs, warranty) |
| **Contact / Footer** | Contact form, phone, address, dynamic Google Maps embed |
| **Shopping Cart** | Add/remove items, quantity stepper, order summary |
| **Checkout** | 3-step flow — Delivery/Pickup → Payment (Pay on Delivery / M-Pesa) → Order Confirmation |
| **WhatsApp FAB** | Floating chat button (configurable number via admin settings) |
| **Dark / Light Mode** | System-aware theme with toggle in header and admin sidebar |

---

### Admin Panel (`/admin`)

| Page | Description |
|---|---|
| **Dashboard** | Overview stats — orders, repairs, revenue |
| **Products** | Add, edit, delete products with multiple image uploads, description, specs, category, stock |
| **Orders** | View and manage customer orders |
| **Repairs** | View all repair bookings, update status (Received → Diagnostic → In Repair → Ready → Completed), assign technician, set estimated cost, add notes |
| **Manage Services** | Edit service prices and toggle services on/off — changes reflect immediately on the website |
| **Custom Builds** | Edit budget ranges shown to customers; view and manage all build requests with status tracking |
| **E-Waste Disposal** | View all disposal drop-off requests, update status (Pending → Confirmed → Received → Processed) |
| **Reports** | Generate and download PDF reports for Sales, Orders, and Service Jobs with date range filter |
| **Site Settings** | Update company name, logos (light/dark), map coordinates, phone, WhatsApp number |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Routing | React Router v6 |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| PDF Generation | jsPDF + jsPDF-AutoTable |
| Theme | next-themes |
| Icons | Lucide React |
| Notifications | Sonner |
| Testing | Vitest + @testing-library/react |

---

## Project Structure

```
alpha-tech-hub-ui/
├── src/
│   ├── assets/              # Logo images, hero photo
│   ├── components/
│   │   ├── admin/           # All admin panel pages
│   │   ├── landing/         # All customer-facing sections
│   │   └── ui/              # shadcn/ui primitives
│   ├── contexts/            # Global state (Products, Cart, Services, Custom Builds, Disposal, Site Config)
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities (PDF generation, cn helper)
│   ├── pages/               # Route-level pages (Index, Cart, Checkout, ProductDetail, Admin layouts)
│   └── test/                # Vitest unit + property tests
├── public/
│   ├── logo-red.png         # Favicon
│   ├── robots.txt
│   └── sitemap.xml
└── index.html               # SEO meta tags, structured data (JSON-LD)
```

---

## Getting Started

```bash
# Install dependencies
cd alpha-tech-hub-ui
npm install

# Start development server
npm run dev

# Run tests
npx vitest run

# Build for production
npm run build
```

---

## State Management

All app state lives in React Context providers mounted in `main.tsx`:

- **`SiteConfigProvider`** — company name, logos, map coords, phone, WhatsApp
- **`ProductsProvider`** — product catalogue (shared between catalog and admin)
- **`ServicesProvider`** — repair services, prices, bookings/tickets
- **`CustomBuildsProvider`** — budget ranges and build requests
- **`DisposalProvider`** — e-waste disposal requests
- **`CartProvider`** — shopping cart with localStorage persistence

---

## SEO

- Full meta tags (title, description, keywords, geo, canonical)
- Open Graph + Twitter Card tags
- JSON-LD structured data (`ComputerStore` schema)
- `sitemap.xml` and `robots.txt` in `/public`

> Update `alphacomputersnanyuki.co.ke` and `+254700000000` in `index.html` with the real domain and phone number before going live.

---

## Tests

25 passing tests across 4 files:

| File | Tests | Coverage |
|---|---|---|
| `theme.test.tsx` | 3 | Dark/light class toggling |
| `siteConfig.test.tsx` | 7 | localStorage persistence, defaults, partial merge |
| `cart.test.tsx` | 14 | Property tests — add/remove invariant, total price correctness |
| `example.test.ts` | 1 | Sanity check |

---

## Deployment

The app is a standard Vite SPA. Deploy to any static host (Vercel, Netlify, GitHub Pages):

```bash
npm run build
# Output in dist/
```

For client-side routing to work, configure your host to redirect all 404s to `index.html`.

---

## License

Private — Alpha Computers Nanyuki. All rights reserved.
