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
  // 10) Products (Abayas) from CSV in SAME directory as this seed file
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

  // Group images by label => one product per label, multiple images
  const byLabel = new Map<string, CsvRow[]>();
  for (const r of rows) {
    const key = r.label.trim();
    if (!byLabel.has(key)) byLabel.set(key, []);
    byLabel.get(key)!.push(r);
  }

  // Categories (idempotent)
  const targetCategories = ["Abayas", "Looks", "Sets", "New Collections"];
  let categoryResult = await productModuleService.listProductCategories({
    name: targetCategories
  });

  const existingCatNames = new Set(categoryResult.map(c => c.name));
  const catsToCreate = targetCategories
    .filter(n => !existingCatNames.has(n))
    .map(n => ({ name: n, is_active: true }));

  if (catsToCreate.length) {
    try {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: catsToCreate },
      });
      categoryResult = [...categoryResult, ...result];
    } catch (e) {
      logger.warn(`Failed to create CSV categories: ${e.message}`);
      // Re-fetch to be safe
      categoryResult = await productModuleService.listProductCategories({
        name: targetCategories
      });
    }
  }

  logger.info(`Categories available for CSV: ${categoryResult.map(c => c?.name).join(", ")}`);

  const catId = (type: string) => {
    const t = (type || "").toLowerCase();
    const find = (n: string) => categoryResult.find((c) => c?.name?.toLowerCase() === n.toLowerCase());

    let cat = find("Abayas"); // Default
    if (t === "abaya") cat = find("Abayas");
    else if (t === "look") cat = find("Looks");
    else if (t === "set") cat = find("Sets");

    // Fallback if specific or default 'Abayas' not found
    if (!cat) cat = categoryResult[0];

    if (!cat) {
      throw new Error(`Critical: No categories available to assign to product type '${type}'`);
    }
    return cat.id;
  };

  // Build products; create only those not existing by handle
  const productsToCreate: any[] = [];

  for (const [label, items] of byLabel.entries()) {
    const handle = slugify(label);
    const first = items[0];

    const exists = await productModuleService.listProducts({ handle });
    if (exists?.length) {
      logger.info(`Product '${handle}' exists. Deleting to apply updates...`);
      await deleteProductsWorkflow(container).run({
        input: { ids: exists.map(p => p.id) }
      });
    }

    const title = label.replace(/-/g, " ").replace(/\s+/g, " ").trim();
    const color = (first.color || "").trim();
    const style = (first.style || "").trim();
    const type = (first.type || "").trim();

    productsToCreate.push({
      title,
      handle,
      description: `${type} / ${style} / ${color}`.trim(),
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile!.id,
      category_ids: [catId(type)],
      images: items.map((it) => ({ url: it.url })),

      // Store useful info for filtering/search
      metadata: {
        type,
        style,
        color,
        source: "csv",
      },

      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: [
        {
          title: "S",
          sku: `${handle}-S`.toUpperCase(),
          options: { Size: "S" },
          prices: generatePricesFromBHD(
            type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
              ? 25
              : 20
          ), // Abayas/Coats = 25 BHD, Sets/Looks/Dresses(Makhawir) = 20 BHD
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
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    });
  }

  if (productsToCreate.length) {
    logger.info(`Creating ${productsToCreate.length} products from CSV...`);
    await createProductsWorkflow(container).run({
      input: { products: productsToCreate },
    });
    logger.info("Finished creating products from CSV.");
  } else {
    logger.info("No new products to create from CSV.");
  }

  // -----------------------
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
  // 12) Create "New Collections" Collection (if not exists)
  // -----------------------
  logger.info("Seeding 'New Collections' collection...");
  const [existingColls] = await productModuleService.listAndCountProductCollections({
    title: "New Collections"
  });

  let newCollectionId = existingColls[0]?.id;

  if (!newCollectionId) {
    const createdColl = await productModuleService.createProductCollections([
      { title: "New Collections", handle: "new-collections" }
    ]);
    newCollectionId = createdColl[0].id;
  }

  // Assign the first 7 created products to this collection
  if (productsToCreate.length > 0 && newCollectionId) {
    const first7 = productsToCreate.slice(0, 7).map(p => p.handle);
    const products = await productModuleService.listProducts({ handle: first7 });

    // There is no direct 'addProductsToCollection' workflow easily available in core-flows sometimes,
    // but we can update the products to have this collection_id.
    // Or just update the products we just created.

    // Actually, updateProductsWorkflow is best.
    // We already have their IDs.

    await Promise.all(products.map(p =>
      productModuleService.updateProducts(p.id, { collection_id: newCollectionId })
    ));
    logger.info(`Assigned ${products.length} products to 'New Collections'.`);
  }

  logger.info("Seed completed successfully.");
  logger.info("------------------------------------------------");
  logger.info("Admin Credentials:");
  logger.info("Email:    admin@medusa-test.com");
  logger.info("Password: supersecret");
  logger.info("------------------------------------------------");
}
