# MpratamaStore

A production-grade full-stack digital product shop with a unique fantasy game / NFT marketplace visual theme.

![MpratamaStore](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwind-css)

## 🎮 Features

### Customer Features
- **Fantasy-Themed Shop**: Dark mode with neon purple/blue/green glows
- **Rarity System**: COMMON, RARE, EPIC, LEGENDARY product tiers
- **Shopping Cart** ("Inventory"): Persistent cart with localStorage
- **Checkout** ("Forge Checkout"): Secure checkout flow
- **Manual Payment**: Bank transfer with proof upload
- **Order History** ("Quest Receipts"): View all orders
- **Digital Delivery** ("Claim Rewards"): Secure downloads with signed URLs

### Admin Dashboard
- **Product Management**: Create, edit, archive products
- **Order Management**: View and update order status
- **Payment Verification**: Approve/reject payment proofs
- **Site Settings**: Configure site name, logo, maintenance mode
- **Payment Settings**: Bank account & gateway configuration
- **Audit Log**: Track all admin actions

### Security
- **JWT-based Sessions**: Secure authentication with jose library
- **Password Hashing**: Argon2 for secure password storage
- **Rate Limiting**: Protection against brute force attacks
- **Role-Based Access Control**: ADMIN and CUSTOMER roles
- **Signed Download URLs**: Secure digital delivery with expiring links

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MpratamaStore.git
   cd MpratamaStore
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start PostgreSQL with Docker**
   ```bash
   docker-compose up -d
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

5. **Run database migrations**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. **Seed the database**
   ```bash
   npx prisma db seed
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Open the app**
   - Shop: http://localhost:3000
   - Admin: http://localhost:3000/admin

### Default Admin Credentials

- **Email**: mpratamagpt@gmail.com
- **Username**: mpragans
- **Password**: Anonymous263

## 🌐 GitHub Codespaces

This project is fully configured for GitHub Codespaces:

1. Click "Code" > "Codespaces" > "Create codespace on main"
2. Wait for the container to build
3. Run `npm run setup` to initialize the database
4. Start developing!

## 📦 Deployment to Vercel

### Prerequisites

1. A Vercel account
2. A PostgreSQL database (Supabase, Neon, Railway, etc.)

### Deploy Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Configure environment variables

3. **Environment Variables**
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-super-secret-key
   NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
   ADMIN_EMAIL=mpratamagpt@gmail.com
   ADMIN_USERNAME=mpragans
   ADMIN_PASSWORD=Anonymous263
   ```

4. **Run migrations**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Deploy!**

## 🗂 Project Structure

```
MpratamaStore/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── src/
│   ├── app/
│   │   ├── (auth)/        # Auth pages (login, register, etc.)
│   │   ├── (shop)/        # Public shop pages
│   │   ├── admin/         # Admin dashboard
│   │   └── api/           # API routes
│   ├── components/
│   │   ├── layout/        # Layout components
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # React hooks (cart, auth)
│   └── lib/               # Utilities (auth, prisma, etc.)
├── public/
│   └── uploads/           # Uploaded files
├── docker-compose.yml     # PostgreSQL container
└── .devcontainer/         # Codespaces config
```

## 🎨 Fantasy Theme Vocabulary

| Standard Term | Fantasy Term |
|--------------|--------------|
| Cart | Inventory |
| Checkout | Forge Checkout |
| Orders | Quest Receipts |
| Downloads | Claim Rewards |
| Products | Digital Artifacts |
| Common | Common (white glow) |
| Rare | Rare (blue glow) |
| Epic | Epic (purple glow) |
| Legendary | Legendary (gold glow) |

## 📝 API Routes

### Public
- `GET /api/products` - List products
- `GET /api/products/[slug]` - Get product details
- `GET /api/categories` - List categories
- `GET /api/settings/payment` - Get payment info

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Protected (Customer)
- `POST /api/orders` - Create order
- `GET /api/orders` - List user orders
- `GET /api/orders/[id]` - Get order details
- `POST /api/orders/payment-proof` - Upload payment proof
- `GET /api/downloads/[id]` - Get download URL

### Admin
- `GET/POST /api/admin/products` - Product CRUD
- `GET/PATCH /api/admin/orders/[id]` - Order management
- `POST /api/admin/payments/[id]/approve` - Approve payment
- `POST /api/admin/payments/[id]/reject` - Reject payment
- `GET/PUT /api/admin/settings/site` - Site settings
- `GET/PUT /api/admin/settings/payment` - Payment settings

## 🔧 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT (jose) + Argon2
- **Validation**: Zod
- **Icons**: Lucide React

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

Built with 💜 by [Mpratama](https://github.com/mpratama)