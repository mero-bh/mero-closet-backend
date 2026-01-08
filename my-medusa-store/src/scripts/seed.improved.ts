import fs from "fs";
import path from "path";

import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createUsersWorkflow,
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  deleteProductsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

// Exchange Rates relative to 1 BHD
const EXCHANGE_RATES_BHD: Record<string, number> = {
  BHD: 1,
  USD: 2.65,
  EUR: 2.45,
  SAR: 10,
  AED: 9.75,
  KWD: 0.81,
  QAR: 9.68,
  JOD: 1.88,
  IQD: 3480,
  EGP: 82,
  GBP: 2.10,
};

const generatePricesFromBHD = (amountInBHD: number) => {
  return Object.entries(EXCHANGE_RATES_BHD).map(([code, rate]) => ({
    currency_code: code.toLowerCase(),
    amount: Number((amountInBHD * rate).toFixed(2)),
  }));
};
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

type CsvRow = {
  file: string;
  label: string;
  type: "abaya" | "look" | "set" | string;
  color: string;
  style: string;
  public_id?: string;
  url: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function safeReadCsvRows(csvPath: string): CsvRow[] {
  const raw = fs.readFileSync(csvPath, "utf-8");
  // Works with quoted CSV (like yours) and BOM.
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) return [];

  // Simple, robust-ish CSV parser for quoted fields:
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"' && line[i + 1] === '"' && inQuotes) {
        // Escaped quote
        cur += '"';
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }

      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());

  const get = (obj: Record<string, string>, key: string) =>
    (obj[key] ?? "").trim();

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (!cols.length) continue;

    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] ?? "";
    }

    const url = get(obj, "url");
    const label = get(obj, "label");

    if (!url || !label) continue;

    rows.push({
      file: get(obj, "file"),
      label,
      type: get(obj, "type"),
      color: get(obj, "color"),
      style: get(obj, "style"),
      public_id: get(obj, "public_id") || undefined,
      url,
    });
  }

  return rows;
}

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => ({
              currency_code: currency.currency_code,
              is_default: currency.is_default ?? false,
            })
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);
    return new WorkflowResponse(stores);
  }
);

export default async function seedGulfAbayaStore({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  // Product module (for idempotent product creation)
  const productModuleService = container.resolve(Modules.PRODUCT);

  // GCC + Bahrain
  const countries = ["bh", "sa", "ae", "kw", "qa", "om"];

  // -----------------------
  // 0) Admin User
  // -----------------------
  logger.info("Seeding admin user...");
  const userModuleService = container.resolve(Modules.USER);
  const users = await userModuleService.listUsers({ email: "admin@medusa-test.com" });

  if (!users.length) {
    await createUsersWorkflow(container).run({
      input: {
        users: [
          {
            email: "admin@medusa-test.com",
            first_name: "Admin",
            last_name: "User",
          },
        ],
      },
    });
  } else {
    logger.info("Admin user already exists, skipping.");
  }

  // -----------------------
  // 1) Store
  // -----------------------
  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_locales: [
          { locale_code: "ar-BH" },
          { locale_code: "en-US" },
        ],
      },
    },
  });

  // -----------------------
  // 2) Sales channel
  // -----------------------
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Default Sales Channel" }] },
    });
    defaultSalesChannel = result;
  }

  // -----------------------
  // 3) Currencies (BHD default)
  // -----------------------
  logger.info("Seeding store currencies...");
  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        { currency_code: "bhd", is_default: true },
        { currency_code: "sar" },
        { currency_code: "aed" },
        { currency_code: "kwd" },
        { currency_code: "qar" },
        { currency_code: "jod" },
        { currency_code: "iqd" },
        { currency_code: "egp" },
        { currency_code: "usd" },
        { currency_code: "eur" },
        { currency_code: "gbp" },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_sales_channel_id: defaultSalesChannel[0].id },
    },
  });

  // -----------------------
  // 4) Region (Gulf)
  // -----------------------
  logger.info("Seeding region data (Gulf)...");
  const regionModuleService = container.resolve(Modules.REGION);
  let region = (await regionModuleService.listRegions({ name: "Gulf" }))[0];

  if (!region) {
    try {
      const { result } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "Gulf",
              currency_code: "bhd",
              countries,
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      });
      region = result[0];
    } catch (e) {
      logger.warn(`Failed to create 'Gulf' region (possibly country conflict): ${e.message}`);
      // Fallback: try to find a region that has 'bh'
      const existingRegions = await regionModuleService.listRegions({ currency_code: "bhd" });
      if (existingRegions.length) {
        region = existingRegions[0];
        logger.info(`Using existing region '${region.name}' as fallback.`);
      } else {
        // Try fetching by country if possible or generic list
        const all = await regionModuleService.listRegions({}, { take: 100, relations: ["countries"] });
        region = all.find(r => r.countries?.some(c => c.iso_2 === "bh")) || all[0];
        if (region) logger.info(`Using existing region '${region.name}' as fallback.`);
      }
    }
  } else {
    logger.info("Region 'Gulf' already exists, skipping.");
  }

  // -----------------------
  // 5) Tax regions (idempotent best effort)
  // -----------------------
  logger.info("Seeding tax regions...");
  try {
    const taxModuleService = container.resolve(Modules.TAX);
    const existingTaxRegions = await taxModuleService.listTaxRegions({
      country_code: countries,
    });

    if (existingTaxRegions.length === countries.length) {
      logger.info("All tax regions already exist, skipping.");
    } else {
      await createTaxRegionsWorkflow(container).run({
        input: countries.map((country_code) => ({
          country_code,
          provider_id: "tp_system",
        })),
      });
    }
  } catch (e) {
    logger.warn(
      "Tax module/provider not available or listTaxRegions differs in this setup. Skipping tax regions."
    );
  }

  // -----------------------
  // 6) Stock location (Manama)
  // -----------------------
  logger.info("Seeding stock location data (Gulf Warehouse)...");
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);
  let stockLocation = (
    await stockLocationModuleService.listStockLocations({
      name: "Gulf Warehouse",
    })
  )[0];

  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Gulf Warehouse",
            address: {
              city: "Manama",
              country_code: "bh",
              address_1: "",
            },
          },
        ],
      },
    });
    stockLocation = result[0];
  } else {
    logger.info("Stock location 'Gulf Warehouse' already exists, skipping.");
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_location_id: stockLocation.id },
    },
  });

  // Link stock location to manual fulfillment provider (best-effort)
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    });
  } catch { }

  // -----------------------
  // 7) Shipping profile
  // -----------------------
  logger.info("Seeding shipping profile...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });

  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [{ name: "Default Shipping Profile", type: "default" }],
      },
    });
    shippingProfile = result[0];
  }

  // -----------------------
  // 8) Fulfillment set + service zone (safe even if already exists)
  // -----------------------
  logger.info("Seeding fulfillment set/service zone...");
  let fulfillmentSet = (
    await fulfillmentModuleService.listFulfillmentSets({
      name: "Gulf Warehouse delivery",
    })
  )[0];

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Gulf Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Gulf",
          geo_zones: countries.map((country_code) => ({
            country_code,
            type: "country" as const,
          })),
        },
      ],
    });
  } else {
    logger.info("Fulfillment set already exists, skipping creation.");
  }

  // Link stock location to fulfillment set (best-effort)
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    });
  } catch { }

  // Resolve serviceZoneId safely (fixes your previous crash)
  let serviceZoneId: string | undefined = fulfillmentSet?.service_zones?.[0]?.id;

  if (!serviceZoneId) {
    try {
      const retrieved = await fulfillmentModuleService.retrieveFulfillmentSet(
        fulfillmentSet.id,
        { relations: ["service_zones", "service_zones.geo_zones"] }
      );
      serviceZoneId = retrieved.service_zones?.[0]?.id;
    } catch { }
  }

  if (!serviceZoneId) {
    const zones = await fulfillmentModuleService.listServiceZones({
      fulfillment_set: { id: fulfillmentSet.id },
    });
    if (!zones?.length) {
      throw new Error(
        `No service zones found for fulfillment set ${fulfillmentSet.id}`
      );
    }
    serviceZoneId = zones[0].id;
  }

  // Shipping options (create only once for this service zone)
  const existingShippingOptions =
    await fulfillmentModuleService.listShippingOptions({
      service_zone: { id: serviceZoneId },
    });

  if (existingShippingOptions.length === 0) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZoneId,
          shipping_profile_id: shippingProfile!.id,
          type: {
            label: "Standard",
            description: "Ship in 2-3 days.",
            code: "standard",
          },
          // Keep it simple: BHD + region price
          prices: [
            { currency_code: "bhd", amount: 1 },
            { region_id: region.id, amount: 1 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
        {
          name: "Express Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZoneId,
          shipping_profile_id: shippingProfile!.id,
          type: {
            label: "Express",
            description: "Ship in 24 hours.",
            code: "express",
          },
          prices: [
            { currency_code: "bhd", amount: 2 },
            { region_id: region.id, amount: 2 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
  } else {
    logger.info("Shipping options already exist, skipping.");
  }

  // -----------------------
  // 9) Publishable API Key (best-effort)
  // -----------------------
  logger.info("Seeding publishable API key data...");
  try {
    const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
      container
    ).run({
      input: {
        api_keys: [{ title: "Webshop", type: "publishable", created_by: "" }],
      },
    });

    const publishableApiKey = publishableApiKeyResult[0];

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableApiKey.id, add: [defaultSalesChannel[0].id] },
    });
  } catch {
    logger.warn("API key workflow not available in this setup. Skipping.");
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [defaultSalesChannel[0].id] },
  });

  // -----------------------
  
  // -----------------------
  // 10) Products from CSV in SAME directory as this seed file
  // -----------------------
  logger.info("Reading products_with_urls.csv...");

  const csvPath = path.join(__dirname, "products_with_urls.csv");

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `CSV not found. Put products_with_urls.csv in: ${path.dirname(csvPath)}`
    );
  }

  const rows = safeReadCsvRows(csvPath);
  if (!rows.length) {
    throw new Error("CSV loaded but contains no valid rows with (label,url).");
  }

  type AssetKind = "image" | "video";

  type NormalizedRow = CsvRow & {
    asset_kind: AssetKind;
    base_label: string;
    normalized_url: string;
    normalized_public_id: string;
    normalized_file: string;
  };

  // Infer Cloudinary cloud name from the CSV URLs, allow override via env
  const inferCloudNameFromUrl = (u: string): string | null => {
    const m = u.match(/https:\/\/res\.cloudinary\.com\/([^/]+)\//i);
    return m?.[1] ?? null;
  };

  const inferredCloud = rows
    .map((r) => (r.url || "").trim())
    .filter(Boolean)
    .map(inferCloudNameFromUrl)
    .find(Boolean);

  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || inferredCloud || "").trim();
  if (!cloudName) {
    logger.warn(
      "Could not infer Cloudinary cloud name. Video thumbnails and missing URL reconstruction may be limited."
    );
  }

  const isVideo = (r: CsvRow, url: string): boolean => {
    const t = (r.type || "").toLowerCase().trim();
    const f = (r.file || "").toLowerCase().trim();
    return (
      t === "video" ||
      url.includes("/video/") ||
      /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ||
      /\.(mp4|mov|webm|m4v)$/i.test(f)
    );
  };

  const normalizeUrl = (r: CsvRow): { url: string; kind: AssetKind } | null => {
    const rawUrl = (r.url || "").trim();
    const kind: AssetKind = isVideo(r, rawUrl) ? "video" : "image";

    if (rawUrl) return { url: rawUrl, kind };

    // Try to reconstruct missing URLs from public_id + file extension
    const publicId = (r.public_id || "").trim();
    const file = (r.file || "").trim();
    const extMatch = file.match(/\.[a-z0-9]+$/i);
    const ext = (extMatch?.[0] || (kind === "video" ? ".mp4" : ".png")).toLowerCase();

    if (cloudName && publicId) {
      const resource = kind === "video" ? "video" : "image";
      return {
        url: `https://res.cloudinary.com/${cloudName}/${resource}/upload/${publicId}${ext}`,
        kind,
      };
    }

    return null;
  };

  const normalizedRows: NormalizedRow[] = [];
  for (const r of rows) {
    const label = (r.label || "").trim();
    if (!label) continue;

    const urlInfo = normalizeUrl(r);
    if (!urlInfo) {
      logger.warn(
        `Skipping row with missing url (and no way to reconstruct it): label='${label}', file='${(r.file || "").trim()}', public_id='${(r.public_id || "").trim()}'`
      );
      continue;
    }

    const base_label = label.replace(/-video$/i, "").trim();
    if (!base_label) continue;

    normalizedRows.push({
      ...r,
      asset_kind: urlInfo.kind,
      base_label,
      normalized_url: urlInfo.url,
      normalized_public_id: (r.public_id || "").trim(),
      normalized_file: (r.file || "").trim(),
    });
  }

  if (!normalizedRows.length) {
    throw new Error("CSV normalized to zero usable rows (check label/url/public_id).");
  }

  // Group assets by base_label => one product per base_label
  const byBaseLabel = new Map<string, NormalizedRow[]>();
  const handlesInOrder: string[] = [];

  for (const r of normalizedRows) {
    if (!byBaseLabel.has(r.base_label)) {
      byBaseLabel.set(r.base_label, []);
      handlesInOrder.push(slugify(r.base_label));
    }
    byBaseLabel.get(r.base_label)!.push(r);
  }

  // Categories (idempotent)
  const targetCategories = ["Abayas", "Looks", "Sets", "New Collections"];
  let categoryResult = await productModuleService.listProductCategories({
    name: targetCategories as any,
  });

  const existingCatNames = new Set(categoryResult.map((c: any) => c.name));
  const catsToCreate = targetCategories
    .filter((n) => !existingCatNames.has(n))
    .map((n) => ({ name: n, is_active: true }));

  if (catsToCreate.length) {
    try {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: catsToCreate },
      });
      categoryResult = [...categoryResult, ...result];
    } catch (e: any) {
      logger.warn(`Failed to create CSV categories: ${e?.message || e}`);
      categoryResult = await productModuleService.listProductCategories({
        name: targetCategories as any,
      });
    }
  }

  const catId = (type: string): string => {
    const t = (type || "").toLowerCase();
    const find = (name: string) => categoryResult.find((c: any) => c.name === name);
    let cat = find("Abayas"); // Default

    if (t.includes("abaya") || t.includes("coat")) cat = find("Abayas");
    else if (t.includes("look")) cat = find("Looks");
    else if (t.includes("set")) cat = find("Sets");

    // Fallback if specific not found
    if (!cat) cat = categoryResult[0];

    if (!cat) {
      throw new Error(`Critical: No categories available to assign (type='${type}')`);
    }
    return cat.id;
  };

  const dedupe = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

  const videoThumbFromUrl = (u: string): string | null => {
    // Cloudinary can serve a video frame as image by changing extension to .jpg
    // Example: .../video/upload/.../file.mp4 -> .../video/upload/.../file.jpg
    if (!u) return null;
    if (!u.includes("/video/")) return null;
    return u.replace(/\.(mp4|mov|webm|m4v)(\?|$)/i, ".jpg$2");
  };

  const inferTypeFromBase = (base: string, fallback: string): string => {
    const b = (base || "").toLowerCase();
    if (fallback && fallback.toLowerCase() !== "video") return fallback;
    if (b.includes("look")) return "look";
    if (b.includes("set")) return "set";
    if (b.includes("abaya") || b.includes("coat")) return "abaya";
    return "abaya";
  };

  // Fetch existing products for all handles (best-effort bulk; fallback to per-handle)
  const fetchExistingByHandles = async (handles: string[]) => {
    const map = new Map<string, any>();
    const unique = Array.from(new Set(handles.filter(Boolean)));

    if (!unique.length) return map;

    try {
      const products = await productModuleService.listProducts({
        handle: unique as any,
      });
      for (const p of products || []) {
        if (p?.handle) map.set(p.handle, p);
      }
      return map;
    } catch (e: any) {
      logger.warn(`Bulk listProducts(handle: string[]) failed; falling back to per-handle. (${e?.message || e})`);
    }

    for (const h of unique) {
      try {
        const products = await productModuleService.listProducts({ handle: h });
        for (const p of products || []) {
          if (p?.handle) map.set(p.handle, p);
        }
      } catch (e: any) {
        logger.warn(`Failed to listProducts for handle='${h}': ${e?.message || e}`);
      }
    }
    return map;
  };

  const existingByHandle = await fetchExistingByHandles(handlesInOrder);

  // Modes:
  // - skip: keep existing products, only create missing
  // - update: update existing products in-place (safe subset of fields)
  // - recreate: delete existing then create fresh (default if not provided)
  const mode = (process.env.SEED_PRODUCT_MODE || "recreate").toLowerCase();

  const productsToCreate: any[] = [];
  const idsToDelete: string[] = [];

  // Update existing products in a safe way (no variant recreation)
  const updateExistingProduct = async (existing: any, input: any) => {
    const patch: any = {
      title: input.title,
      description: input.description,
      status: input.status,
      thumbnail: input.thumbnail,
      metadata: input.metadata,
      // Many Medusa setups accept images as array of urls or array of objects; keep consistent with create input
      images: input.images,
      category_ids: input.category_ids,
    };

    try {
      await productModuleService.updateProducts(existing.id, patch);
      logger.info(`Updated product '${existing.handle}' (${existing.id}).`);
    } catch (e: any) {
      logger.warn(`Failed to update product '${existing.handle}': ${e?.message || e}`);
    }
  };

  for (const [baseLabel, items] of byBaseLabel.entries()) {
    const handle = slugify(baseLabel);

    const firstNonVideo = items.find((x) => (x.type || "").toLowerCase().trim() !== "video");
    const first = firstNonVideo || items[0];

    const type = inferTypeFromBase(baseLabel, (first.type || "").trim());
    const style = (first.style || "").trim();
    const color = (first.color || "").trim();

    const imageUrls = dedupe(
      items.filter((x) => x.asset_kind === "image").map((x) => x.normalized_url.trim())
    );
    const videoUrls = dedupe(
      items.filter((x) => x.asset_kind === "video").map((x) => x.normalized_url.trim())
    );

    const title = baseLabel.replace(/-/g, " ").replace(/\s+/g, " ").trim();
    const description = `${type} / ${style} / ${color}`.replace(/\s+\/\s+\/\s+/g, " / ").trim();

    const thumbnail =
      imageUrls[0] ||
      (videoUrls[0] ? videoThumbFromUrl(videoUrls[0]) : null) ||
      null;

    const input: any = {
      title,
      handle,
      description,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile!.id,
      category_ids: [catId(type)],
      images: imageUrls.map((u) => ({ url: u })),
      thumbnail: thumbnail || undefined,
      metadata: {
        type,
        style,
        color,
        ...(videoUrls.length ? { videos: videoUrls } : {}),
      },
      options: [{ title: "Size", values: ["XS", "S", "M", "L", "XL"] }],
      variants: [
        {
          title: "XS",
          sku: `${handle}-XS`.toUpperCase(),
          options: { Size: "XS" },
          prices: generatePricesFromBHD(
            type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
              ? 25
              : 20
          ),
        },
        {
          title: "S",
          sku: `${handle}-S`.toUpperCase(),
          options: { Size: "S" },
          prices: generatePricesFromBHD(
            type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
              ? 25
              : 20
          ),
        },
        {
          title: "M",
          sku: `${handle}-M`.toUpperCase(),
          options: { Size: "M" },
          prices: generatePricesFromBHD(
            type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
              ? 25
              : 20
          ),
        },
        {
          title: "L",
          sku: `${handle}-L`.toUpperCase(),
          options: { Size: "L" },
          prices: generatePricesFromBHD(
            type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
              ? 25
              : 20
          ),
        },
        {
          title: "XL",
          sku: `${handle}-XL`.toUpperCase(),
          options: { Size: "XL" },
          prices: generatePricesFromBHD(
            type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
              ? 25
              : 20
          ),
        },
      ],
    };

    const existing = existingByHandle.get(handle);

    if (existing) {
      if (mode === "skip") {
        logger.info(`Product '${handle}' exists. Skipping (SEED_PRODUCT_MODE=skip).`);
        continue;
      }
      if (mode === "update") {
        await updateExistingProduct(existing, input);
        continue;
      }
      // recreate
      idsToDelete.push(existing.id);
    }

    productsToCreate.push(input);
  }

  if (idsToDelete.length) {
    logger.info(`Deleting ${idsToDelete.length} existing products (SEED_PRODUCT_MODE=recreate)...`);
    await deleteProductsWorkflow(container).run({
      input: { ids: Array.from(new Set(idsToDelete)) },
    });
  }

  if (productsToCreate.length) {
    logger.info(`Creating ${productsToCreate.length} products from CSV...`);
    try {
      await createProductsWorkflow(container).run({
        input: { products: productsToCreate },
      });
      logger.info("Finished creating products from CSV.");
    } catch (e: any) {
      logger.error(`Failed creating products from CSV: ${e?.message || e}`);
      throw e;
    }
  } else {
    logger.info("No new products to create from CSV.");
  }

  // -----------------------
  // 10.1) Ensure 'New Collections' exists & assign first 7 CSV handles
  // -----------------------
  logger.info("Seeding 'New Collections' collection...");
  const [existingColls] = await productModuleService.listAndCountProductCollections({
    title: "New Collections",
  } as any);

  let newCollectionId = existingColls[0]?.id;

  if (!newCollectionId) {
    const createdColl = await productModuleService.createProductCollections([
      { title: "New Collections", handle: "new-collections" },
    ]);
    newCollectionId = createdColl[0].id;
  }

  if (newCollectionId) {
    const first7Handles = handlesInOrder.slice(0, 7);
    const productsToAssign = await fetchExistingByHandles(first7Handles);

    const assignTargets = Array.from(productsToAssign.values());

    if (assignTargets.length) {
      await Promise.all(
        assignTargets.map((p: any) =>
          productModuleService.updateProducts(p.id, { collection_id: newCollectionId })
        )
      );
      logger.info(`Assigned ${assignTargets.length} products to 'New Collections'.`);
    } else {
      logger.warn("No products found to assign to 'New Collections'.");
    }
  }


  // 11) Inventory levels (try/catch for idempotency)
  // -----------------------
  logger.info("Seeding inventory levels...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  if (inventoryItems.length) {
    const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems.map(
      (it: { id: string }) => ({
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: it.id,
      })
    );

    try {
      await createInventoryLevelsWorkflow(container).run({
        input: { inventory_levels: inventoryLevels },
      });
    } catch (e) {
      logger.info("Inventory levels likely exist, skipping creation.");
    }
  }

  // -----------------------
  

  logger.info("Seed completed successfully.");
  logger.info("------------------------------------------------");
  logger.info("Admin Credentials:");
  logger.info("Email:    admin@medusa-test.com");
  logger.info("Password: supersecret");
  logger.info("------------------------------------------------");
}
