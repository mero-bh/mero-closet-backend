import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

import { TAGS } from 'lib/constants';
import type { Cart, Collection, Menu, Money, Page, Product, ProductVariant } from './types';

// NOTE:
// This project started as the Vercel Commerce (Shopify) template.
// For Mero Closet we use Medusa v2 Store API instead, while keeping the same exports
// so the UI components keep working.

const backendUrl = (process.env.MEDUSA_BACKEND_URL || '').replace(/\/$/, '');
const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY || '';

const storeBase = backendUrl ? `${backendUrl}/store` : '';

type MedusaFetchOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  tags?: string[];
  cacheSeconds?: number;
};

async function medusaFetch<T>(path: string, opts: MedusaFetchOptions = {}): Promise<T> {
  if (!storeBase) {
    throw new Error('MEDUSA_BACKEND_URL is not set');
  }
  if (!publishableKey) {
    throw new Error('MEDUSA_PUBLISHABLE_KEY is not set');
  }

  const url = new URL(`${storeBase}${path.startsWith('/') ? path : `/${path}`}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: opts.method || 'GET',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-publishable-api-key': publishableKey
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    // Next.js fetch caching
    next: {
      tags: opts.tags,
      revalidate: opts.cacheSeconds
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Medusa request failed (${res.status}) ${url.pathname}: ${text}`);
  }

  return (await res.json()) as T;
}

// ----------------------
// Region + currency
// ----------------------

async function getDefaultRegion(): Promise<{ id: string; currency_code: string }> {
  const data = await medusaFetch<{ regions: any[] }>(`/regions`, {
    query: { limit: 50 },
    tags: [TAGS.collections],
    cacheSeconds: 3600 // Cache for 1 hour
  });

  const regions = data?.regions || [];
  // Seed creates a "Gulf Region" with BHD currency.
  // Prefer Gulf/BHD if available, otherwise take the first one.
  const gulf = regions.find(
    (r) => (r?.name || '').toLowerCase().includes('gulf') || (r?.currency_code || '').toLowerCase() === 'bhd'
  );
  const region = gulf || regions[0];

  if (!region?.id) {
    // If no regions exist, this is a critical error for a Medusa store.
    throw new Error('No region found in Medusa store. Please run the seed script or create a region in Admin.');
  }

  return {
    id: region.id,
    currency_code: (region.currency_code || 'bhd').toLowerCase()
  };
}

function money(amount: number | string | null | undefined, currencyCode: string): Money {
  const normalized = amount === null || amount === undefined ? '0' : String(amount);
  return { amount: normalized, currencyCode: currencyCode.toUpperCase() };
}

function pickVariantPrice(variant: any, currencyCode: string): Money {
  const prices: any[] = variant?.prices || variant?.price_set?.prices || [];
  const match = prices.find((p) => (p?.currency_code || '').toLowerCase() === currencyCode.toLowerCase());
  const amount = match?.amount ?? variant?.calculated_price?.calculated_amount ?? variant?.calculated_price ?? 0;
  const code = (match?.currency_code || currencyCode || 'bhd').toUpperCase();
  return money(amount, code);
}

function mapVariant(v: any, currencyCode: string): ProductVariant {
  const selectedOptions: { name: string; value: string }[] = [];

  // Medusa variants may have `options: [{ option: { title }, value }]`
  if (Array.isArray(v?.options)) {
    for (const o of v.options) {
      const name = o?.option?.title || o?.option_title || o?.title;
      const value = o?.value;
      if (name && value) selectedOptions.push({ name, value });
    }
  }

  // Or `options: { Size: 'M' }` (created in seed input)
  if (!selectedOptions.length && v?.options && typeof v.options === 'object' && !Array.isArray(v.options)) {
    for (const [name, value] of Object.entries(v.options)) {
      selectedOptions.push({ name, value: String(value) });
    }
  }

  return {
    id: v?.id,
    title: v?.title || 'Default',
    availableForSale: true,
    selectedOptions,
    price: pickVariantPrice(v, currencyCode)
  };
}

function mapProduct(p: any, currencyCode: string): Product {
  const images = (p?.images || []).map((img: any) => ({
    url: img?.url,
    altText: p?.title || '',
    width: 1024,
    height: 1024
  }));

  const variants = (p?.variants || []).map((v: any) => mapVariant(v, currencyCode));
  const prices = variants.map((v: any) => Number(v.price.amount || 0));
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;

  // Options: try Medusa product options first, fallback to variants' selectedOptions.
  const options = Array.isArray(p?.options)
    ? p.options.map((o: any) => ({
      id: o?.id || o?.title,
      name: o?.title,
      values: (o?.values || []).map((v: any) => v?.value || v)
    }))
    : [];

  if (!options.length && variants.length) {
    const byName = new Map<string, Set<string>>();
    for (const v of variants) {
      for (const opt of v.selectedOptions) {
        if (!byName.has(opt.name)) byName.set(opt.name, new Set());
        byName.get(opt.name)!.add(opt.value);
      }
    }
    for (const [name, set] of byName.entries()) {
      options.push({ id: name, name, values: Array.from(set) });
    }
  }

  const featuredImage = images[0] || { url: '', altText: p?.title || '', width: 1024, height: 1024 };
  const updatedAt = p?.updated_at || p?.updatedAt || new Date().toISOString();

  // Add `metadata` as a non-typed field (used for filtering collections).
  return {
    id: p?.id,
    handle: p?.handle,
    availableForSale: true,
    title: p?.title,
    description: p?.description || '',
    descriptionHtml: p?.description || '',
    options,
    priceRange: {
      minVariantPrice: money(min, currencyCode),
      maxVariantPrice: money(max, currencyCode)
    },
    variants,
    featuredImage,
    images,
    seo: {
      title: p?.title,
      description: (p?.description || '').slice(0, 150)
    },
    tags: [],
    updatedAt,
    // non-Shopify field
    metadata: p?.metadata || {}
  } as any;
}

// ----------------------
// Cart mapping
// ----------------------

function mapCart(cart: any, currencyCode: string): Cart {
  const items: any[] = cart?.items || cart?.line_items || [];

  const lines = items.map((it) => {
    const variant = it?.variant || it?.variant_id || it?.variant;
    const product = variant?.product || it?.product || {};
    const imgUrl =
      product?.thumbnail ||
      product?.images?.[0]?.url ||
      variant?.product?.images?.[0]?.url ||
      '';

    const totalAmount =
      it?.total ||
      it?.subtotal ||
      (it?.unit_price !== undefined ? Number(it.unit_price) * Number(it.quantity || 0) : 0);

    const selectedOptions: { name: string; value: string }[] = [];
    if (Array.isArray(variant?.options)) {
      for (const o of variant.options) {
        const name = o?.option?.title || o?.option_title || o?.title;
        const value = o?.value;
        if (name && value) selectedOptions.push({ name, value });
      }
    }

    return {
      id: it?.id,
      quantity: Number(it?.quantity || 0),
      cost: {
        totalAmount: money(totalAmount, it?.currency_code || cart?.currency_code || currencyCode)
      },
      merchandise: {
        id: variant?.id || it?.variant_id,
        title: variant?.title || 'Default',
        selectedOptions,
        product: {
          id: product?.id || '',
          handle: product?.handle || '',
          title: product?.title || '',
          featuredImage: {
            url: imgUrl,
            altText: product?.title || '',
            width: 1024,
            height: 1024
          }
        }
      }
    };
  });

  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
  const cartCurrency = (cart?.currency_code || currencyCode || 'bhd').toUpperCase();
  const total = cart?.total || cart?.total_amount || 0;
  const subtotal = cart?.subtotal || cart?.subtotal_amount || total;
  const tax = cart?.tax_total || cart?.tax_amount || 0;

  return {
    id: cart?.id,
    checkoutUrl: `/checkout?cart_id=${encodeURIComponent(cart?.id || '')}`,
    cost: {
      subtotalAmount: money(subtotal, cartCurrency),
      totalAmount: money(total, cartCurrency),
      totalTaxAmount: money(tax, cartCurrency)
    },
    lines,
    totalQuantity
  };
}

// ----------------------
// Public API (same as the template)
// ----------------------

export async function createCart(): Promise<Cart> {
  const region = await getDefaultRegion();
  const data = await medusaFetch<{ cart: any }>(`/carts`, {
    method: 'POST',
    body: { region_id: region.id },
    tags: [TAGS.cart]
  });

  revalidateTag(TAGS.cart);
  return mapCart(data.cart, region.currency_code);
}

export async function addToCart(lines: { merchandiseId: string; quantity: number }[]): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value;
  if (!cartId) {
    // If no cart yet, create one then add.
    const cart = await createCart();
    (await cookies()).set('cartId', cart.id || '');
  }

  const finalCartId = (await cookies()).get('cartId')?.value!;
  const region = await getDefaultRegion();

  // Medusa expects one line-item per request.
  let lastCart: any | null = null;
  for (const l of lines) {
    const res = await medusaFetch<{ cart: any }>(`/carts/${finalCartId}/line-items`, {
      method: 'POST',
      body: { variant_id: l.merchandiseId, quantity: l.quantity },
      tags: [TAGS.cart]
    });
    lastCart = res.cart;
  }

  revalidateTag(TAGS.cart);
  return mapCart(lastCart, region.currency_code);
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;
  const region = await getDefaultRegion();

  let last: any | null = null;
  for (const id of lineIds) {
    const res = await medusaFetch<any>(`/carts/${cartId}/line-items/${id}`, {
      method: 'DELETE',
      tags: [TAGS.cart]
    });

    // Docs mention deleteLineItem returns updated cart in `parent`.
    last = res?.parent || res?.cart || res;
  }

  revalidateTag(TAGS.cart);
  return mapCart(last, region.currency_code);
}

export async function updateCart(
  lines: { id: string; merchandiseId: string; quantity: number }[]
): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;
  const region = await getDefaultRegion();

  let last: any | null = null;
  for (const l of lines) {
    const res = await medusaFetch<{ cart: any }>(`/carts/${cartId}/line-items/${l.id}`, {
      method: 'POST',
      body: { quantity: l.quantity },
      tags: [TAGS.cart]
    });
    last = res.cart || res;
  }

  revalidateTag(TAGS.cart);
  return mapCart(last, region.currency_code);
}

export async function getCart(): Promise<Cart | undefined> {
  const cartId = (await cookies()).get('cartId')?.value;
  if (!cartId) return undefined;

  try {
    const region = await getDefaultRegion();
    const data = await medusaFetch<{ cart: any }>(`/carts/${cartId}`, {
      query: {
        // Ask for rich cart data (works even if Medusa ignores unknown fields).
        fields: '*items,*items.variant,*items.variant.product,*items.variant.options,*items.variant.prices,total,subtotal,tax_total,currency_code'
      },
      tags: [TAGS.cart],
      cacheSeconds: 5
    });
    return mapCart(data.cart, region.currency_code);
  } catch {
    // Old/invalid cart id.
    return undefined;
  }
}

export async function getProducts({
  query
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  const region = await getDefaultRegion();
  const data = await medusaFetch<{ products: any[] }>(`/products`, {
    query: {
      limit: 100,
      q: query,
      fields: 'id,handle,title,description,metadata,updated_at,*images,*variants,*variants.prices,*options'
    },
    tags: [TAGS.products],
    cacheSeconds: 60
  });
  return (data.products || []).map((p) => mapProduct(p, region.currency_code));
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  const region = await getDefaultRegion();
  const data = await medusaFetch<{ products: any[] }>(`/products`, {
    query: {
      limit: 1,
      handle,
      fields: 'id,handle,title,description,metadata,updated_at,*images,*variants,*variants.prices,*options'
    },
    tags: [TAGS.products],
    cacheSeconds: 60
  });

  const p = (data.products || [])[0];
  if (p) return mapProduct(p, region.currency_code);

  // Fallback if the backend doesn't support filtering by handle in query.
  const all = await getProducts({});
  return all.find((x) => x.handle === handle);
}

export async function getProductRecommendations(productId: string): Promise<Product[]> {
  // Medusa doesn't provide recommendations out of the box.
  // Return a small curated list (exclude the current product).
  const all = await getProducts({});
  return all.filter((p) => p.id !== productId).slice(0, 8);
}

// Collections are implemented using the CSV metadata (type: abaya/look/set).
export async function getCollections(): Promise<Collection[]> {
  // Fetch high-level categories
  const data = await medusaFetch<{ product_categories: any[] }>('/product-categories', {
    query: {
      parent_category_id: 'null', // Only root categories
      include_descendants_tree: 'false',
      limit: 20
    },
    tags: ['collections'],
    cacheSeconds: 3600
  });

  const categories = data.product_categories || [];
  const collections: Collection[] = [];

  for (const c of categories) {
    // Attempt to fetch one product to get a featured image for the category
    const productsData = await medusaFetch<{ products: any[] }>('/products', {
      query: {
        limit: 1,
        category_id: [c.id],
        fields: '*images'
      },
      cacheSeconds: 3600
    });

    const product = productsData.products?.[0];
    const imgUrl = product?.images?.[0]?.url || product?.thumbnail || '';

    // Map to Collection type
    // Next.js Image component needs valid URLs, ensure we have one or fallback
    collections.push({
      handle: c.handle,
      title: c.name,
      description: c.description || c.name,
      seo: { title: c.name, description: c.description || c.name },
      path: `/search/${c.handle}`,
      updatedAt: c.updated_at,
      image: imgUrl ? {
        url: imgUrl,
        altText: c.name,
        width: 800,
        height: 600
      } : undefined
    } as any);
  }

  return collections;
}

export async function getCollection(handle: string): Promise<Collection | undefined> {
  const data = await medusaFetch<{ product_categories: any[] }>('/product-categories', {
    query: { handle },
    tags: ['collections'],
    cacheSeconds: 3600
  });

  const c = data.product_categories?.[0];
  if (!c) return undefined;

  // We don't fetch image for single collection view usually, or we could if needed
  return {
    handle: c.handle,
    title: c.name,
    description: c.description || c.name,
    seo: { title: c.name, description: c.description || c.name },
    path: `/search/${c.handle}`,
    updatedAt: c.updated_at
  };
}

export async function getCollectionProducts({
  collection,
  query,
  reverse,
  sortKey
}: {
  collection: string;
  reverse?: boolean;
  sortKey?: string;
  query?: string;
}): Promise<Product[]> {
  // 1. Resolve collection handle to Category ID
  const catData = await medusaFetch<{ product_categories: any[] }>('/product-categories', {
    query: { handle: collection },
    cacheSeconds: 3600
  });

  const categoryId = catData.product_categories?.[0]?.id;

  // 2. Fetch products
  // Note: Medusa sort params might differ from Shopify's sortKey
  const region = await getDefaultRegion();
  const data = await medusaFetch<{ products: any[] }>(`/products`, {
    query: {
      limit: 100,
      q: query,
      category_id: categoryId ? [categoryId] : undefined,
      fields: 'id,handle,title,description,metadata,updated_at,*images,*variants,*variants.prices,*options'
    },
    tags: [TAGS.products],
    cacheSeconds: 60
  });

  return (data.products || []).map((p) => mapProduct(p, region.currency_code));
}

export async function getMenu(handle: string): Promise<Menu[]> {
  // Dynamic menu based on collections
  const collections = await getCollections();

  const items: Menu[] = collections.map(c => ({
    title: c.title,
    path: c.path
  }));

  // Add "All" at the start
  items.unshift({ title: 'All', path: '/search' });

  if (handle.includes('footer')) {
    return [
      ...items,
      { title: 'About', path: '/about' },
      { title: 'Return Policy', path: '/returns' }
    ];
  }

  return items;
}

// Simple static pages (so `/about` etc work without Shopify CMS)
const PAGES: Page[] = [
  {
    id: 'about',
    title: 'About Mero Closet',
    handle: 'about',
    body: `<p><strong>Mero Closet</strong> — Gulf luxury abayas, mokhawir, and curated looks.</p><p>Quality fabrics, clean tailoring, and modern details.</p>`,
    bodySummary: 'Gulf luxury abayas, mokhawir, and curated looks.',
    seo: { title: 'About Mero Closet', description: 'Gulf luxury abayas and mokhawir.' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'returns',
    title: 'Return Policy',
    handle: 'returns',
    body: `<p>Returns are accepted within 7 days for unused items with original packaging.</p><p>Contact us to start a return.</p>`,
    bodySummary: 'Returns within 7 days for unused items.',
    seo: { title: 'Return Policy', description: 'Returns within 7 days for unused items.' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getPage(handle: string): Promise<Page> {
  const page = PAGES.find((p) => p.handle === handle);
  // Match previous behavior: return null-ish if not found.
  return (page as any) || (null as any);
}

export async function getPages(): Promise<Page[]> {
  return PAGES;
}

// Kept for compatibility with the template's webhook endpoint.
// For Medusa, you can later wire webhooks to call this route with your own secret.
export async function revalidate(_req: NextRequest): Promise<NextResponse> {
  revalidateTag(TAGS.collections);
  revalidateTag(TAGS.products);
  return (await import('next/server')).NextResponse.json({ status: 200, revalidated: true });
}
