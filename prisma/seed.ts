import { PrismaClient, Role, ProductStatus, Rarity, DeliveryType } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // ==================== ADMIN USER ====================
  const adminEmail = process.env.ADMIN_EMAIL || 'mpratamagpt@gmail.com'
  const adminUsername = process.env.ADMIN_USERNAME || 'mpragans'
  const adminPassword = process.env.ADMIN_PASSWORD || 'Anonymous263'

  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN }
  })

  if (!existingAdmin) {
    const hashedPassword = await argon2.hash(adminPassword)
    await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        passwordHash: hashedPassword,
        role: Role.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
        emailVerified: new Date(),
      }
    })
    console.log(`✅ Admin user created: ${adminEmail}`)
  } else {
    console.log('ℹ️ Admin user already exists, skipping...')
  }

  // ==================== SITE SETTINGS ====================
  await prisma.siteSetting.upsert({
    where: { id: 'site-settings' },
    update: {},
    create: {
      id: 'site-settings',
      siteTitle: 'MpratamaStore',
      siteTagline: 'Fantasy Digital Market — Claim Your Rewards',
      siteDescription: 'Toko produk digital bertema fantasy: script, bot, asset, ebook. Checkout cepat, download aman, dan pengalaman UI seperti marketplace game.',
      maintenanceMode: false,
      storeNotice: '🎮 Welcome to the Fantasy Market! New items added weekly.',
    }
  })
  console.log('✅ Site settings created')

  // ==================== SEO SETTINGS ====================
  await prisma.seoSetting.upsert({
    where: { id: 'seo-settings' },
    update: {},
    create: {
      id: 'seo-settings',
      defaultMetaTitle: 'MpratamaStore - Fantasy Digital Market',
      defaultMetaDescription: 'Toko produk digital bertema fantasy: script, bot, asset, ebook. Checkout cepat, download aman, dan pengalaman UI seperti marketplace game.',
      robotsIndex: true,
      robotsFollow: true,
      generateSitemap: true,
    }
  })
  console.log('✅ SEO settings created')

  // ==================== PAYMENT SETTINGS ====================
  await prisma.paymentSetting.upsert({
    where: { id: 'payment-settings' },
    update: {},
    create: {
      id: 'payment-settings',
      mode: 'BOTH',
      manualAccounts: [
        { bank: 'BCA', accountNumber: '1234567890', accountName: 'MpratamaStore' },
        { bank: 'DANA', accountNumber: '08123456789', accountName: 'MpratamaStore' },
        { bank: 'GoPay', accountNumber: '08123456789', accountName: 'MpratamaStore' },
      ],
      manualInstructions: 'Transfer sesuai total pesanan. Screenshot bukti transfer dan upload di halaman konfirmasi. Pesanan akan diproses dalam 1x24 jam.',
    }
  })
  console.log('✅ Payment settings created')

  // ==================== CATEGORIES ====================
  const categories = [
    { name: 'Script', slug: 'script', description: 'Automation scripts and tools', seoTitle: 'Scripts - MpratamaStore', seoDescription: 'Premium automation scripts for various platforms' },
    { name: 'Bot', slug: 'bot', description: 'Automated bots for different platforms', seoTitle: 'Bots - MpratamaStore', seoDescription: 'High-quality bots for automation' },
    { name: 'AI', slug: 'ai', description: 'AI-powered tools and prompts', seoTitle: 'AI Tools - MpratamaStore', seoDescription: 'AI tools, prompts, and configurations' },
    { name: 'Ebook', slug: 'ebook', description: 'Digital books and guides', seoTitle: 'Ebooks - MpratamaStore', seoDescription: 'Premium ebooks and digital guides' },
    { name: 'Asset', slug: 'asset', description: 'Digital assets and templates', seoTitle: 'Assets - MpratamaStore', seoDescription: 'Digital assets, templates, and resources' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }
  console.log('✅ Categories created')

  // ==================== TAGS ====================
  const tags = [
    { name: 'Automation', slug: 'automation' },
    { name: 'Prompt', slug: 'prompt' },
    { name: 'NFT Vibe', slug: 'nft-vibe' },
    { name: 'Fantasy', slug: 'fantasy' },
    { name: 'Pro', slug: 'pro' },
    { name: 'Beginner', slug: 'beginner' },
    { name: 'Advanced', slug: 'advanced' },
    { name: 'Premium', slug: 'premium' },
  ]

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    })
  }
  console.log('✅ Tags created')

  // ==================== PRODUCTS ====================
  const scriptCategory = await prisma.category.findUnique({ where: { slug: 'script' } })
  const botCategory = await prisma.category.findUnique({ where: { slug: 'bot' } })
  const aiCategory = await prisma.category.findUnique({ where: { slug: 'ai' } })
  const ebookCategory = await prisma.category.findUnique({ where: { slug: 'ebook' } })
  const assetCategory = await prisma.category.findUnique({ where: { slug: 'asset' } })

  const automationTag = await prisma.tag.findUnique({ where: { slug: 'automation' } })
  const promptTag = await prisma.tag.findUnique({ where: { slug: 'prompt' } })
  const proTag = await prisma.tag.findUnique({ where: { slug: 'pro' } })
  const premiumTag = await prisma.tag.findUnique({ where: { slug: 'premium' } })

  const products = [
    {
      name: 'Dragon Slayer Script',
      slug: 'dragon-slayer-script',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Powerful automation script with legendary capabilities',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A legendary automation script that helps you conquer any task. Features include auto-retry, error handling, and multi-threading support.' }] }] },
      price: 299000,
      compareAtPrice: 499000,
      rarity: Rarity.LEGENDARY,
      stats: { automation: 10, speed: 9, reliability: 10 },
      deliveryType: DeliveryType.FILE,
      categoryId: scriptCategory?.id,
      seoTitle: 'Dragon Slayer Script - Premium Automation',
      seoDescription: 'Get the most powerful automation script with legendary features.',
      publishedAt: new Date(),
    },
    {
      name: 'Phoenix Bot Pro',
      slug: 'phoenix-bot-pro',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Epic bot that rises from any failure',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The Phoenix Bot automatically recovers from errors and continues operation. Perfect for 24/7 automation needs.' }] }] },
      price: 199000,
      compareAtPrice: 349000,
      rarity: Rarity.EPIC,
      stats: { automation: 8, speed: 7, reliability: 9 },
      deliveryType: DeliveryType.LICENSE_KEY,
      categoryId: botCategory?.id,
      seoTitle: 'Phoenix Bot Pro - Resilient Automation',
      seoDescription: 'A bot that never gives up. Auto-recovery and 24/7 operation.',
      publishedAt: new Date(),
    },
    {
      name: 'Shadow Walker Bot',
      slug: 'shadow-walker-bot',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Stealthy bot for discrete operations',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Operates silently in the background. Low resource usage, high efficiency.' }] }] },
      price: 149000,
      rarity: Rarity.RARE,
      stats: { automation: 7, speed: 8, stealth: 10 },
      deliveryType: DeliveryType.FILE,
      categoryId: botCategory?.id,
      publishedAt: new Date(),
    },
    {
      name: 'AI Prompt Master Collection',
      slug: 'ai-prompt-master-collection',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Legendary collection of 500+ AI prompts',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A curated collection of 500+ prompts for ChatGPT, Claude, and other AI assistants. Covers coding, writing, business, and creativity.' }] }] },
      price: 149000,
      compareAtPrice: 299000,
      rarity: Rarity.LEGENDARY,
      stats: { prompts: 500, categories: 20, quality: 10 },
      deliveryType: DeliveryType.FILE,
      categoryId: aiCategory?.id,
      publishedAt: new Date(),
    },
    {
      name: 'Basic Automation Script',
      slug: 'basic-automation-script',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Simple yet effective automation',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Perfect for beginners. Easy to set up and use. Includes documentation and video tutorial.' }] }] },
      price: 49000,
      rarity: Rarity.COMMON,
      stats: { automation: 5, speed: 5, ease: 10 },
      deliveryType: DeliveryType.FILE,
      categoryId: scriptCategory?.id,
      publishedAt: new Date(),
    },
    {
      name: 'Warrior Script Pack',
      slug: 'warrior-script-pack',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Battle-tested scripts for serious users',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '5 powerful scripts in one pack. Tested in production environments.' }] }] },
      price: 199000,
      rarity: Rarity.RARE,
      stats: { scripts: 5, automation: 8, value: 9 },
      deliveryType: DeliveryType.FILE,
      categoryId: scriptCategory?.id,
      publishedAt: new Date(),
    },
    {
      name: 'Ebook: Mastering Automation',
      slug: 'ebook-mastering-automation',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Complete guide to automation mastery',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '200+ pages of automation knowledge. From basics to advanced techniques.' }] }] },
      price: 79000,
      rarity: Rarity.RARE,
      stats: { pages: 200, chapters: 15, exercises: 50 },
      deliveryType: DeliveryType.FILE,
      categoryId: ebookCategory?.id,
      publishedAt: new Date(),
    },
    {
      name: 'AI Assistant Config Pack',
      slug: 'ai-assistant-config-pack',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Pre-configured AI assistant setups',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ready-to-use configurations for various AI assistants. Optimized for productivity.' }] }] },
      price: 99000,
      rarity: Rarity.EPIC,
      stats: { configs: 10, platforms: 5, setup_time: 5 },
      deliveryType: DeliveryType.EXTERNAL_LINK,
      externalLink: 'https://example.com/ai-config',
      categoryId: aiCategory?.id,
      publishedAt: new Date(),
    },
    {
      name: 'Fantasy UI Asset Pack',
      slug: 'fantasy-ui-asset-pack',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Premium fantasy-themed UI components',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '100+ UI components with fantasy theme. Includes buttons, cards, frames, and icons.' }] }] },
      price: 129000,
      rarity: Rarity.EPIC,
      stats: { components: 100, formats: 3, resolution: 4 },
      deliveryType: DeliveryType.FILE,
      categoryId: assetCategory?.id,
      publishedAt: new Date(),
    },
    {
      name: 'Mythic Bot Framework',
      slug: 'mythic-bot-framework',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Build legendary bots with this framework',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A complete framework for building your own bots. Includes templates and documentation.' }] }] },
      price: 349000,
      compareAtPrice: 499000,
      rarity: Rarity.LEGENDARY,
      stats: { templates: 20, modules: 50, support_months: 12 },
      deliveryType: DeliveryType.LICENSE_KEY,
      categoryId: botCategory?.id,
      publishedAt: new Date(),
    },
    {
      name: 'Starter Script Bundle',
      slug: 'starter-script-bundle',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Everything you need to start',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A bundle of 3 beginner-friendly scripts with complete documentation.' }] }] },
      price: 39000,
      rarity: Rarity.COMMON,
      stats: { scripts: 3, difficulty: 1, docs: 10 },
      deliveryType: DeliveryType.FILE,
      categoryId: scriptCategory?.id,
      publishedAt: new Date(),
    },
    {
      name: 'Pro Prompt Engineering Guide',
      slug: 'pro-prompt-engineering-guide',
      status: ProductStatus.PUBLISHED,
      shortDescription: 'Master the art of AI prompting',
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Learn advanced prompt engineering techniques used by professionals.' }] }] },
      price: 89000,
      rarity: Rarity.RARE,
      stats: { techniques: 50, examples: 100, templates: 30 },
      deliveryType: DeliveryType.FILE,
      categoryId: aiCategory?.id,
      publishedAt: new Date(),
    },
  ]

  for (const product of products) {
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } })
    if (!existing) {
      const createdProduct = await prisma.product.create({
        data: {
          ...product,
          tags: {
            connect: [
              automationTag?.id ? { id: automationTag.id } : undefined,
              proTag?.id ? { id: proTag.id } : undefined,
            ].filter(Boolean) as { id: string }[],
          },
        },
      })

      // Add placeholder images
      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          url: `/images/products/${product.slug}.png`,
          alt: product.name,
          sortOrder: 0,
        },
      })
    }
  }
  console.log('✅ Products created')

  // Add license keys for LICENSE_KEY products
  const licenseProducts = await prisma.product.findMany({
    where: { deliveryType: DeliveryType.LICENSE_KEY }
  })

  for (const product of licenseProducts) {
    const existingKeys = await prisma.licenseKey.count({ where: { productId: product.id } })
    if (existingKeys === 0) {
      const keys = Array.from({ length: 10 }, () => ({
        productId: product.id,
        key: `${product.slug.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      }))
      await prisma.licenseKey.createMany({ data: keys })
    }
  }
  console.log('✅ License keys created')

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
