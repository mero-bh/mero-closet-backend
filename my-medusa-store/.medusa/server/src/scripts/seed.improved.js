"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = seedGulfAbayaStore;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("@medusajs/framework/utils");
const core_flows_1 = require("@medusajs/medusa/core-flows");
// Exchange Rates relative to 1 BHD
const EXCHANGE_RATES_BHD = {
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
const generatePricesFromBHD = (amountInBHD) => {
    return Object.entries(EXCHANGE_RATES_BHD).map(([code, rate]) => ({
        currency_code: code.toLowerCase(),
        amount: Number((amountInBHD * rate).toFixed(2)),
    }));
};
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}
function safeReadCsvRows(csvPath) {
    const raw = fs_1.default.readFileSync(csvPath, "utf-8");
    // Works with quoted CSV (like yours) and BOM.
    const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    if (lines.length < 2)
        return [];
    // Simple, robust-ish CSV parser for quoted fields:
    const parseLine = (line) => {
        const out = [];
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
    const get = (obj, key) => (obj[key] ?? "").trim();
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        if (!cols.length)
            continue;
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = cols[j] ?? "";
        }
        const url = get(obj, "url");
        const label = get(obj, "label");
        if (!url || !label)
            continue;
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
const updateStoreCurrencies = (0, workflows_sdk_1.createWorkflow)("update-store-currencies", (input) => {
    const normalizedInput = (0, workflows_sdk_1.transform)({ input }, (data) => {
        return {
            selector: { id: data.input.store_id },
            update: {
                supported_currencies: data.input.supported_currencies.map((currency) => ({
                    currency_code: currency.currency_code,
                    is_default: currency.is_default ?? false,
                })),
            },
        };
    });
    const stores = (0, core_flows_1.updateStoresStep)(normalizedInput);
    return new workflows_sdk_1.WorkflowResponse(stores);
});
async function seedGulfAbayaStore({ container }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const link = container.resolve(utils_1.ContainerRegistrationKeys.LINK);
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const fulfillmentModuleService = container.resolve(utils_1.Modules.FULFILLMENT);
    const salesChannelModuleService = container.resolve(utils_1.Modules.SALES_CHANNEL);
    const storeModuleService = container.resolve(utils_1.Modules.STORE);
    // Product module (for idempotent product creation)
    const productModuleService = container.resolve(utils_1.Modules.PRODUCT);
    // GCC + Bahrain
    const countries = ["bh", "sa", "ae", "kw", "qa", "om"];
    // -----------------------
    // 0) Admin User
    // -----------------------
    logger.info("Seeding admin user...");
    const userModuleService = container.resolve(utils_1.Modules.USER);
    const users = await userModuleService.listUsers({ email: "admin@medusa-test.com" });
    if (!users.length) {
        await (0, core_flows_1.createUsersWorkflow)(container).run({
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
    }
    else {
        logger.info("Admin user already exists, skipping.");
    }
    // -----------------------
    // 1) Store
    // -----------------------
    logger.info("Seeding store data...");
    const [store] = await storeModuleService.listStores();
    await (0, core_flows_1.updateStoresWorkflow)(container).run({
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
        const { result } = await (0, core_flows_1.createSalesChannelsWorkflow)(container).run({
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
    await (0, core_flows_1.updateStoresWorkflow)(container).run({
        input: {
            selector: { id: store.id },
            update: { default_sales_channel_id: defaultSalesChannel[0].id },
        },
    });
    // -----------------------
    // 4) Region (Gulf)
    // -----------------------
    logger.info("Seeding region data (Gulf)...");
    const regionModuleService = container.resolve(utils_1.Modules.REGION);
    let region = (await regionModuleService.listRegions({ name: "Gulf" }))[0];
    if (!region) {
        try {
            const { result } = await (0, core_flows_1.createRegionsWorkflow)(container).run({
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
        }
        catch (e) {
            logger.warn(`Failed to create 'Gulf' region (possibly country conflict): ${e.message}`);
            // Fallback: try to find a region that has 'bh'
            const existingRegions = await regionModuleService.listRegions({ currency_code: "bhd" });
            if (existingRegions.length) {
                region = existingRegions[0];
                logger.info(`Using existing region '${region.name}' as fallback.`);
            }
            else {
                // Try fetching by country if possible or generic list
                const all = await regionModuleService.listRegions({}, { take: 100, relations: ["countries"] });
                region = all.find(r => r.countries?.some(c => c.iso_2 === "bh")) || all[0];
                if (region)
                    logger.info(`Using existing region '${region.name}' as fallback.`);
            }
        }
    }
    else {
        logger.info("Region 'Gulf' already exists, skipping.");
    }
    // -----------------------
    // 5) Tax regions (idempotent best effort)
    // -----------------------
    logger.info("Seeding tax regions...");
    try {
        const taxModuleService = container.resolve(utils_1.Modules.TAX);
        const existingTaxRegions = await taxModuleService.listTaxRegions({
            country_code: countries,
        });
        if (existingTaxRegions.length === countries.length) {
            logger.info("All tax regions already exist, skipping.");
        }
        else {
            await (0, core_flows_1.createTaxRegionsWorkflow)(container).run({
                input: countries.map((country_code) => ({
                    country_code,
                    provider_id: "tp_system",
                })),
            });
        }
    }
    catch (e) {
        logger.warn("Tax module/provider not available or listTaxRegions differs in this setup. Skipping tax regions.");
    }
    // -----------------------
    // 6) Stock location (Manama)
    // -----------------------
    logger.info("Seeding stock location data (Gulf Warehouse)...");
    const stockLocationModuleService = container.resolve(utils_1.Modules.STOCK_LOCATION);
    let stockLocation = (await stockLocationModuleService.listStockLocations({
        name: "Gulf Warehouse",
    }))[0];
    if (!stockLocation) {
        const { result } = await (0, core_flows_1.createStockLocationsWorkflow)(container).run({
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
    }
    else {
        logger.info("Stock location 'Gulf Warehouse' already exists, skipping.");
    }
    await (0, core_flows_1.updateStoresWorkflow)(container).run({
        input: {
            selector: { id: store.id },
            update: { default_location_id: stockLocation.id },
        },
    });
    // Link stock location to manual fulfillment provider (best-effort)
    try {
        await link.create({
            [utils_1.Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
            [utils_1.Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
        });
    }
    catch { }
    // -----------------------
    // 7) Shipping profile
    // -----------------------
    logger.info("Seeding shipping profile...");
    const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
        type: "default",
    });
    let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;
    if (!shippingProfile) {
        const { result } = await (0, core_flows_1.createShippingProfilesWorkflow)(container).run({
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
    let fulfillmentSet = (await fulfillmentModuleService.listFulfillmentSets({
        name: "Gulf Warehouse delivery",
    }))[0];
    if (!fulfillmentSet) {
        fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
            name: "Gulf Warehouse delivery",
            type: "shipping",
            service_zones: [
                {
                    name: "Gulf",
                    geo_zones: countries.map((country_code) => ({
                        country_code,
                        type: "country",
                    })),
                },
            ],
        });
    }
    else {
        logger.info("Fulfillment set already exists, skipping creation.");
    }
    // Link stock location to fulfillment set (best-effort)
    try {
        await link.create({
            [utils_1.Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
            [utils_1.Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
        });
    }
    catch { }
    // Resolve serviceZoneId safely (fixes your previous crash)
    let serviceZoneId = fulfillmentSet?.service_zones?.[0]?.id;
    if (!serviceZoneId) {
        try {
            const retrieved = await fulfillmentModuleService.retrieveFulfillmentSet(fulfillmentSet.id, { relations: ["service_zones", "service_zones.geo_zones"] });
            serviceZoneId = retrieved.service_zones?.[0]?.id;
        }
        catch { }
    }
    if (!serviceZoneId) {
        const zones = await fulfillmentModuleService.listServiceZones({
            fulfillment_set: { id: fulfillmentSet.id },
        });
        if (!zones?.length) {
            throw new Error(`No service zones found for fulfillment set ${fulfillmentSet.id}`);
        }
        serviceZoneId = zones[0].id;
    }
    // Shipping options (create only once for this service zone)
    const existingShippingOptions = await fulfillmentModuleService.listShippingOptions({
        service_zone: { id: serviceZoneId },
    });
    if (existingShippingOptions.length === 0) {
        await (0, core_flows_1.createShippingOptionsWorkflow)(container).run({
            input: [
                {
                    name: "Standard Shipping",
                    price_type: "flat",
                    provider_id: "manual_manual",
                    service_zone_id: serviceZoneId,
                    shipping_profile_id: shippingProfile.id,
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
                    shipping_profile_id: shippingProfile.id,
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
    }
    else {
        logger.info("Shipping options already exist, skipping.");
    }
    // -----------------------
    // 9) Publishable API Key (best-effort)
    // -----------------------
    logger.info("Seeding publishable API key data...");
    try {
        const { result: publishableApiKeyResult } = await (0, core_flows_1.createApiKeysWorkflow)(container).run({
            input: {
                api_keys: [{ title: "Webshop", type: "publishable", created_by: "" }],
            },
        });
        const publishableApiKey = publishableApiKeyResult[0];
        await (0, core_flows_1.linkSalesChannelsToApiKeyWorkflow)(container).run({
            input: { id: publishableApiKey.id, add: [defaultSalesChannel[0].id] },
        });
    }
    catch {
        logger.warn("API key workflow not available in this setup. Skipping.");
    }
    await (0, core_flows_1.linkSalesChannelsToStockLocationWorkflow)(container).run({
        input: { id: stockLocation.id, add: [defaultSalesChannel[0].id] },
    });
    // -----------------------
    // -----------------------
    // 10) Products from CSV in SAME directory as this seed file
    // -----------------------
    logger.info("Reading products_with_urls.csv...");
    const csvPath = path_1.default.join(__dirname, "products_with_urls.csv");
    if (!fs_1.default.existsSync(csvPath)) {
        throw new Error(`CSV not found. Put products_with_urls.csv in: ${path_1.default.dirname(csvPath)}`);
    }
    const rows = safeReadCsvRows(csvPath);
    if (!rows.length) {
        throw new Error("CSV loaded but contains no valid rows with (label,url).");
    }
    // Infer Cloudinary cloud name from the CSV URLs, allow override via env
    const inferCloudNameFromUrl = (u) => {
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
        logger.warn("Could not infer Cloudinary cloud name. Video thumbnails and missing URL reconstruction may be limited.");
    }
    const isVideo = (r, url) => {
        const t = (r.type || "").toLowerCase().trim();
        const f = (r.file || "").toLowerCase().trim();
        return (t === "video" ||
            url.includes("/video/") ||
            /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ||
            /\.(mp4|mov|webm|m4v)$/i.test(f));
    };
    const normalizeUrl = (r) => {
        const rawUrl = (r.url || "").trim();
        const kind = isVideo(r, rawUrl) ? "video" : "image";
        if (rawUrl)
            return { url: rawUrl, kind };
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
    const normalizedRows = [];
    for (const r of rows) {
        const label = (r.label || "").trim();
        if (!label)
            continue;
        const urlInfo = normalizeUrl(r);
        if (!urlInfo) {
            logger.warn(`Skipping row with missing url (and no way to reconstruct it): label='${label}', file='${(r.file || "").trim()}', public_id='${(r.public_id || "").trim()}'`);
            continue;
        }
        const base_label = label.replace(/-video$/i, "").trim();
        if (!base_label)
            continue;
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
    const byBaseLabel = new Map();
    const handlesInOrder = [];
    for (const r of normalizedRows) {
        if (!byBaseLabel.has(r.base_label)) {
            byBaseLabel.set(r.base_label, []);
            handlesInOrder.push(slugify(r.base_label));
        }
        byBaseLabel.get(r.base_label).push(r);
    }
    // Categories (idempotent)
    const targetCategories = ["Abayas", "Looks", "Sets", "New Collections"];
    let categoryResult = await productModuleService.listProductCategories({
        name: targetCategories,
    });
    const existingCatNames = new Set(categoryResult.map((c) => c.name));
    const catsToCreate = targetCategories
        .filter((n) => !existingCatNames.has(n))
        .map((n) => ({ name: n, is_active: true }));
    if (catsToCreate.length) {
        try {
            const { result } = await (0, core_flows_1.createProductCategoriesWorkflow)(container).run({
                input: { product_categories: catsToCreate },
            });
            categoryResult = [...categoryResult, ...result];
        }
        catch (e) {
            logger.warn(`Failed to create CSV categories: ${e?.message || e}`);
            categoryResult = await productModuleService.listProductCategories({
                name: targetCategories,
            });
        }
    }
    const catId = (type) => {
        const t = (type || "").toLowerCase();
        const find = (name) => categoryResult.find((c) => c.name === name);
        let cat = find("Abayas"); // Default
        if (t.includes("abaya") || t.includes("coat"))
            cat = find("Abayas");
        else if (t.includes("look"))
            cat = find("Looks");
        else if (t.includes("set"))
            cat = find("Sets");
        // Fallback if specific not found
        if (!cat)
            cat = categoryResult[0];
        if (!cat) {
            throw new Error(`Critical: No categories available to assign (type='${type}')`);
        }
        return cat.id;
    };
    const dedupe = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const videoThumbFromUrl = (u) => {
        // Cloudinary can serve a video frame as image by changing extension to .jpg
        // Example: .../video/upload/.../file.mp4 -> .../video/upload/.../file.jpg
        if (!u)
            return null;
        if (!u.includes("/video/"))
            return null;
        return u.replace(/\.(mp4|mov|webm|m4v)(\?|$)/i, ".jpg$2");
    };
    const inferTypeFromBase = (base, fallback) => {
        const b = (base || "").toLowerCase();
        if (fallback && fallback.toLowerCase() !== "video")
            return fallback;
        if (b.includes("look"))
            return "look";
        if (b.includes("set"))
            return "set";
        if (b.includes("abaya") || b.includes("coat"))
            return "abaya";
        return "abaya";
    };
    // Fetch existing products for all handles (best-effort bulk; fallback to per-handle)
    const fetchExistingByHandles = async (handles) => {
        const map = new Map();
        const unique = Array.from(new Set(handles.filter(Boolean)));
        if (!unique.length)
            return map;
        try {
            const products = await productModuleService.listProducts({
                handle: unique,
            });
            for (const p of products || []) {
                if (p?.handle)
                    map.set(p.handle, p);
            }
            return map;
        }
        catch (e) {
            logger.warn(`Bulk listProducts(handle: string[]) failed; falling back to per-handle. (${e?.message || e})`);
        }
        for (const h of unique) {
            try {
                const products = await productModuleService.listProducts({ handle: h });
                for (const p of products || []) {
                    if (p?.handle)
                        map.set(p.handle, p);
                }
            }
            catch (e) {
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
    const productsToCreate = [];
    const idsToDelete = [];
    // Update existing products in a safe way (no variant recreation)
    const updateExistingProduct = async (existing, input) => {
        const patch = {
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
        }
        catch (e) {
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
        const imageUrls = dedupe(items.filter((x) => x.asset_kind === "image").map((x) => x.normalized_url.trim()));
        const videoUrls = dedupe(items.filter((x) => x.asset_kind === "video").map((x) => x.normalized_url.trim()));
        const title = baseLabel.replace(/-/g, " ").replace(/\s+/g, " ").trim();
        const description = `${type} / ${style} / ${color}`.replace(/\s+\/\s+\/\s+/g, " / ").trim();
        const thumbnail = imageUrls[0] ||
            (videoUrls[0] ? videoThumbFromUrl(videoUrls[0]) : null) ||
            null;
        const input = {
            title,
            handle,
            description,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
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
                    prices: generatePricesFromBHD(type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
                        ? 25
                        : 20),
                },
                {
                    title: "S",
                    sku: `${handle}-S`.toUpperCase(),
                    options: { Size: "S" },
                    prices: generatePricesFromBHD(type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
                        ? 25
                        : 20),
                },
                {
                    title: "M",
                    sku: `${handle}-M`.toUpperCase(),
                    options: { Size: "M" },
                    prices: generatePricesFromBHD(type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
                        ? 25
                        : 20),
                },
                {
                    title: "L",
                    sku: `${handle}-L`.toUpperCase(),
                    options: { Size: "L" },
                    prices: generatePricesFromBHD(type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
                        ? 25
                        : 20),
                },
                {
                    title: "XL",
                    sku: `${handle}-XL`.toUpperCase(),
                    options: { Size: "XL" },
                    prices: generatePricesFromBHD(type.toLowerCase().includes("abaya") || type.toLowerCase().includes("coat")
                        ? 25
                        : 20),
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
        await (0, core_flows_1.deleteProductsWorkflow)(container).run({
            input: { ids: Array.from(new Set(idsToDelete)) },
        });
    }
    if (productsToCreate.length) {
        logger.info(`Creating ${productsToCreate.length} products from CSV...`);
        try {
            await (0, core_flows_1.createProductsWorkflow)(container).run({
                input: { products: productsToCreate },
            });
            logger.info("Finished creating products from CSV.");
        }
        catch (e) {
            logger.error(`Failed creating products from CSV: ${e?.message || e}`);
            throw e;
        }
    }
    else {
        logger.info("No new products to create from CSV.");
    }
    // -----------------------
    // 10.1) Ensure 'New Collections' exists & assign first 7 CSV handles
    // -----------------------
    logger.info("Seeding 'New Collections' collection...");
    const [existingColls] = await productModuleService.listAndCountProductCollections({
        title: "New Collections",
    });
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
            await Promise.all(assignTargets.map((p) => productModuleService.updateProducts(p.id, { collection_id: newCollectionId })));
            logger.info(`Assigned ${assignTargets.length} products to 'New Collections'.`);
        }
        else {
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
        const inventoryLevels = inventoryItems.map((it) => ({
            location_id: stockLocation.id,
            stocked_quantity: 1000000,
            inventory_item_id: it.id,
        }));
        try {
            await (0, core_flows_1.createInventoryLevelsWorkflow)(container).run({
                input: { inventory_levels: inventoryLevels },
            });
        }
        catch (e) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VlZC5pbXByb3ZlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zY3JpcHRzL3NlZWQuaW1wcm92ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUE2S0EscUNBK3pCQztBQTUrQkQsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUd4QixxREFJbUM7QUFDbkMsNERBaUJxQztBQUVyQyxtQ0FBbUM7QUFDbkMsTUFBTSxrQkFBa0IsR0FBMkI7SUFDakQsR0FBRyxFQUFFLENBQUM7SUFDTixHQUFHLEVBQUUsSUFBSTtJQUNULEdBQUcsRUFBRSxJQUFJO0lBQ1QsR0FBRyxFQUFFLEVBQUU7SUFDUCxHQUFHLEVBQUUsSUFBSTtJQUNULEdBQUcsRUFBRSxJQUFJO0lBQ1QsR0FBRyxFQUFFLElBQUk7SUFDVCxHQUFHLEVBQUUsSUFBSTtJQUNULEdBQUcsRUFBRSxJQUFJO0lBQ1QsR0FBRyxFQUFFLEVBQUU7SUFDUCxHQUFHLEVBQUUsSUFBSTtDQUNWLENBQUM7QUFFRixNQUFNLHFCQUFxQixHQUFHLENBQUMsV0FBbUIsRUFBRSxFQUFFO0lBQ3BELE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELGFBQWEsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO1FBQ2pDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2hELENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDO0FBQ0YscUVBSTJDO0FBWTNDLFNBQVMsT0FBTyxDQUFDLEtBQWE7SUFDNUIsT0FBTyxLQUFLO1NBQ1QsV0FBVyxFQUFFO1NBQ2IsSUFBSSxFQUFFO1NBQ04sT0FBTyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUM7U0FDM0IsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM5QixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsT0FBZTtJQUN0QyxNQUFNLEdBQUcsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM5Qyw4Q0FBOEM7SUFDOUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUV4RSxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBRWhDLG1EQUFtRDtJQUNuRCxNQUFNLFNBQVMsR0FBRyxDQUFDLElBQVksRUFBWSxFQUFFO1FBQzNDLE1BQU0sR0FBRyxHQUFhLEVBQUUsQ0FBQztRQUN6QixJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFFckIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkIsSUFBSSxFQUFFLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNsRCxnQkFBZ0I7Z0JBQ2hCLEdBQUcsSUFBSSxHQUFHLENBQUM7Z0JBQ1gsQ0FBQyxFQUFFLENBQUM7Z0JBQ0osU0FBUztZQUNYLENBQUM7WUFFRCxJQUFJLEVBQUUsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDZixRQUFRLEdBQUcsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JCLFNBQVM7WUFDWCxDQUFDO1lBRUQsSUFBSSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsR0FBRyxHQUFHLEVBQUUsQ0FBQztnQkFDVCxTQUFTO1lBQ1gsQ0FBQztZQUVELEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDWixDQUFDO1FBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDO0lBRUYsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFFaEUsTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUEyQixFQUFFLEdBQVcsRUFBRSxFQUFFLENBQ3ZELENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBRTFCLE1BQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQztJQUUxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3RDLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07WUFBRSxTQUFTO1FBRTNCLE1BQU0sR0FBRyxHQUEyQixFQUFFLENBQUM7UUFDdkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4QyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsQyxDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1QixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLO1lBQUUsU0FBUztRQUU3QixJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ1IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDO1lBQ3RCLEtBQUs7WUFDTCxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUM7WUFDdEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDO1lBQ3hCLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQztZQUN4QixTQUFTLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsSUFBSSxTQUFTO1lBQzdDLEdBQUc7U0FDSixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsTUFBTSxxQkFBcUIsR0FBRyxJQUFBLDhCQUFjLEVBQzFDLHlCQUF5QixFQUN6QixDQUFDLEtBR0EsRUFBRSxFQUFFO0lBQ0gsTUFBTSxlQUFlLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNwRCxPQUFPO1lBQ0wsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFO1lBQ3JDLE1BQU0sRUFBRTtnQkFDTixvQkFBb0IsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDdkQsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2IsYUFBYSxFQUFFLFFBQVEsQ0FBQyxhQUFhO29CQUNyQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsSUFBSSxLQUFLO2lCQUN6QyxDQUFDLENBQ0g7YUFDRjtTQUNGLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sTUFBTSxHQUFHLElBQUEsNkJBQWdCLEVBQUMsZUFBZSxDQUFDLENBQUM7SUFDakQsT0FBTyxJQUFJLGdDQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FDRixDQUFDO0FBRWEsS0FBSyxVQUFVLGtCQUFrQixDQUFDLEVBQUUsU0FBUyxFQUFZO0lBQ3RFLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkUsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRWpFLE1BQU0sd0JBQXdCLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDeEUsTUFBTSx5QkFBeUIsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUMzRSxNQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTVELG1EQUFtRDtJQUNuRCxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRWhFLGdCQUFnQjtJQUNoQixNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFdkQsMEJBQTBCO0lBQzFCLGdCQUFnQjtJQUNoQiwwQkFBMEI7SUFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0lBRXBGLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbEIsTUFBTSxJQUFBLGdDQUFtQixFQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUN2QyxLQUFLLEVBQUU7Z0JBQ0wsS0FBSyxFQUFFO29CQUNMO3dCQUNFLEtBQUssRUFBRSx1QkFBdUI7d0JBQzlCLFVBQVUsRUFBRSxPQUFPO3dCQUNuQixTQUFTLEVBQUUsTUFBTTtxQkFDbEI7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7U0FBTSxDQUFDO1FBQ04sTUFBTSxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRCwwQkFBMEI7SUFDMUIsV0FBVztJQUNYLDBCQUEwQjtJQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDckMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sa0JBQWtCLENBQUMsVUFBVSxFQUFFLENBQUM7SUFFdEQsTUFBTSxJQUFBLGlDQUFvQixFQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUN4QyxLQUFLLEVBQUU7WUFDTCxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRTtZQUMxQixNQUFNLEVBQUU7Z0JBQ04saUJBQWlCLEVBQUU7b0JBQ2pCLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRTtvQkFDeEIsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFO2lCQUN6QjthQUNGO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFFSCwwQkFBMEI7SUFDMUIsbUJBQW1CO0lBQ25CLDBCQUEwQjtJQUMxQixJQUFJLG1CQUFtQixHQUFHLE1BQU0seUJBQXlCLENBQUMsaUJBQWlCLENBQUM7UUFDMUUsSUFBSSxFQUFFLHVCQUF1QjtLQUM5QixDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBQSx3Q0FBMkIsRUFBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDbEUsS0FBSyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSx1QkFBdUIsRUFBRSxDQUFDLEVBQUU7U0FDbEUsQ0FBQyxDQUFDO1FBQ0gsbUJBQW1CLEdBQUcsTUFBTSxDQUFDO0lBQy9CLENBQUM7SUFFRCwwQkFBMEI7SUFDMUIsOEJBQThCO0lBQzlCLDBCQUEwQjtJQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDM0MsTUFBTSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDekMsS0FBSyxFQUFFO1lBQ0wsUUFBUSxFQUFFLEtBQUssQ0FBQyxFQUFFO1lBQ2xCLG9CQUFvQixFQUFFO2dCQUNwQixFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRTtnQkFDMUMsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFO2dCQUN4QixFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUU7Z0JBQ3hCLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRTtnQkFDeEIsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFO2dCQUN4QixFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUU7Z0JBQ3hCLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRTtnQkFDeEIsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFO2dCQUN4QixFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUU7Z0JBQ3hCLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRTtnQkFDeEIsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFO2FBQ3pCO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFFSCxNQUFNLElBQUEsaUNBQW9CLEVBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQ3hDLEtBQUssRUFBRTtZQUNMLFFBQVEsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFO1lBQzFCLE1BQU0sRUFBRSxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtTQUNoRTtLQUNGLENBQUMsQ0FBQztJQUVILDBCQUEwQjtJQUMxQixtQkFBbUI7SUFDbkIsMEJBQTBCO0lBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUM3QyxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlELElBQUksTUFBTSxHQUFHLENBQUMsTUFBTSxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNaLElBQUksQ0FBQztZQUNILE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUEsa0NBQXFCLEVBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUM1RCxLQUFLLEVBQUU7b0JBQ0wsT0FBTyxFQUFFO3dCQUNQOzRCQUNFLElBQUksRUFBRSxNQUFNOzRCQUNaLGFBQWEsRUFBRSxLQUFLOzRCQUNwQixTQUFTOzRCQUNULGlCQUFpQixFQUFFLENBQUMsbUJBQW1CLENBQUM7eUJBQ3pDO3FCQUNGO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMsK0RBQStELENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3hGLCtDQUErQztZQUMvQyxNQUFNLGVBQWUsR0FBRyxNQUFNLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3hGLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMzQixNQUFNLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixNQUFNLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3JFLENBQUM7aUJBQU0sQ0FBQztnQkFDTixzREFBc0Q7Z0JBQ3RELE1BQU0sR0FBRyxHQUFHLE1BQU0sbUJBQW1CLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMvRixNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0UsSUFBSSxNQUFNO29CQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixDQUFDLENBQUM7WUFDakYsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO1NBQU0sQ0FBQztRQUNOLE1BQU0sQ0FBQyxJQUFJLENBQUMseUNBQXlDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsMEJBQTBCO0lBQzFCLDBDQUEwQztJQUMxQywwQkFBMEI7SUFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3RDLElBQUksQ0FBQztRQUNILE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEQsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLGdCQUFnQixDQUFDLGNBQWMsQ0FBQztZQUMvRCxZQUFZLEVBQUUsU0FBUztTQUN4QixDQUFDLENBQUM7UUFFSCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkQsTUFBTSxDQUFDLElBQUksQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1FBQzFELENBQUM7YUFBTSxDQUFDO1lBQ04sTUFBTSxJQUFBLHFDQUF3QixFQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFDNUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3RDLFlBQVk7b0JBQ1osV0FBVyxFQUFFLFdBQVc7aUJBQ3pCLENBQUMsQ0FBQzthQUNKLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNYLE1BQU0sQ0FBQyxJQUFJLENBQ1Qsa0dBQWtHLENBQ25HLENBQUM7SUFDSixDQUFDO0lBRUQsMEJBQTBCO0lBQzFCLDZCQUE2QjtJQUM3QiwwQkFBMEI7SUFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sMEJBQTBCLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDN0UsSUFBSSxhQUFhLEdBQUcsQ0FDbEIsTUFBTSwwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQztRQUNsRCxJQUFJLEVBQUUsZ0JBQWdCO0tBQ3ZCLENBQUMsQ0FDSCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRUwsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25CLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUEseUNBQTRCLEVBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ25FLEtBQUssRUFBRTtnQkFDTCxTQUFTLEVBQUU7b0JBQ1Q7d0JBQ0UsSUFBSSxFQUFFLGdCQUFnQjt3QkFDdEIsT0FBTyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFlBQVksRUFBRSxJQUFJOzRCQUNsQixTQUFTLEVBQUUsRUFBRTt5QkFDZDtxQkFDRjtpQkFDRjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsYUFBYSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1QixDQUFDO1NBQU0sQ0FBQztRQUNOLE1BQU0sQ0FBQyxJQUFJLENBQUMsMkRBQTJELENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRUQsTUFBTSxJQUFBLGlDQUFvQixFQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUN4QyxLQUFLLEVBQUU7WUFDTCxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRTtZQUMxQixNQUFNLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxhQUFhLENBQUMsRUFBRSxFQUFFO1NBQ2xEO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsbUVBQW1FO0lBQ25FLElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNoQixDQUFDLGVBQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxFQUFFLEVBQUU7WUFDakUsQ0FBQyxlQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSx1QkFBdUIsRUFBRSxlQUFlLEVBQUU7U0FDcEUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFWCwwQkFBMEI7SUFDMUIsc0JBQXNCO0lBQ3RCLDBCQUEwQjtJQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDM0MsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDO1FBQzNFLElBQUksRUFBRSxTQUFTO0tBQ2hCLENBQUMsQ0FBQztJQUVILElBQUksZUFBZSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUUzRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDckIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBQSwyQ0FBOEIsRUFBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDckUsS0FBSyxFQUFFO2dCQUNMLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLDBCQUEwQixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQzthQUM5RDtTQUNGLENBQUMsQ0FBQztRQUNILGVBQWUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELDBCQUEwQjtJQUMxQixrRUFBa0U7SUFDbEUsMEJBQTBCO0lBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQUMseUNBQXlDLENBQUMsQ0FBQztJQUN2RCxJQUFJLGNBQWMsR0FBRyxDQUNuQixNQUFNLHdCQUF3QixDQUFDLG1CQUFtQixDQUFDO1FBQ2pELElBQUksRUFBRSx5QkFBeUI7S0FDaEMsQ0FBQyxDQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFTCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDcEIsY0FBYyxHQUFHLE1BQU0sd0JBQXdCLENBQUMscUJBQXFCLENBQUM7WUFDcEUsSUFBSSxFQUFFLHlCQUF5QjtZQUMvQixJQUFJLEVBQUUsVUFBVTtZQUNoQixhQUFhLEVBQUU7Z0JBQ2I7b0JBQ0UsSUFBSSxFQUFFLE1BQU07b0JBQ1osU0FBUyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQzFDLFlBQVk7d0JBQ1osSUFBSSxFQUFFLFNBQWtCO3FCQUN6QixDQUFDLENBQUM7aUJBQ0o7YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7U0FBTSxDQUFDO1FBQ04sTUFBTSxDQUFDLElBQUksQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCx1REFBdUQ7SUFDdkQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ2hCLENBQUMsZUFBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLEVBQUUsRUFBRTtZQUNqRSxDQUFDLGVBQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxFQUFFLEVBQUU7U0FDakUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFWCwyREFBMkQ7SUFDM0QsSUFBSSxhQUFhLEdBQXVCLGNBQWMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7SUFFL0UsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQztZQUNILE1BQU0sU0FBUyxHQUFHLE1BQU0sd0JBQXdCLENBQUMsc0JBQXNCLENBQ3JFLGNBQWMsQ0FBQyxFQUFFLEVBQ2pCLEVBQUUsU0FBUyxFQUFFLENBQUMsZUFBZSxFQUFFLHlCQUF5QixDQUFDLEVBQUUsQ0FDNUQsQ0FBQztZQUNGLGFBQWEsR0FBRyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25ELENBQUM7UUFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQixNQUFNLEtBQUssR0FBRyxNQUFNLHdCQUF3QixDQUFDLGdCQUFnQixDQUFDO1lBQzVELGVBQWUsRUFBRSxFQUFFLEVBQUUsRUFBRSxjQUFjLENBQUMsRUFBRSxFQUFFO1NBQzNDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FDYiw4Q0FBOEMsY0FBYyxDQUFDLEVBQUUsRUFBRSxDQUNsRSxDQUFDO1FBQ0osQ0FBQztRQUNELGFBQWEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFRCw0REFBNEQ7SUFDNUQsTUFBTSx1QkFBdUIsR0FDM0IsTUFBTSx3QkFBd0IsQ0FBQyxtQkFBbUIsQ0FBQztRQUNqRCxZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFO0tBQ3BDLENBQUMsQ0FBQztJQUVMLElBQUksdUJBQXVCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3pDLE1BQU0sSUFBQSwwQ0FBNkIsRUFBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDakQsS0FBSyxFQUFFO2dCQUNMO29CQUNFLElBQUksRUFBRSxtQkFBbUI7b0JBQ3pCLFVBQVUsRUFBRSxNQUFNO29CQUNsQixXQUFXLEVBQUUsZUFBZTtvQkFDNUIsZUFBZSxFQUFFLGFBQWE7b0JBQzlCLG1CQUFtQixFQUFFLGVBQWdCLENBQUMsRUFBRTtvQkFDeEMsSUFBSSxFQUFFO3dCQUNKLEtBQUssRUFBRSxVQUFVO3dCQUNqQixXQUFXLEVBQUUsbUJBQW1CO3dCQUNoQyxJQUFJLEVBQUUsVUFBVTtxQkFDakI7b0JBQ0QscUNBQXFDO29CQUNyQyxNQUFNLEVBQUU7d0JBQ04sRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7d0JBQ25DLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtxQkFDcEM7b0JBQ0QsS0FBSyxFQUFFO3dCQUNMLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTt3QkFDaEUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtxQkFDM0Q7aUJBQ0Y7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLGtCQUFrQjtvQkFDeEIsVUFBVSxFQUFFLE1BQU07b0JBQ2xCLFdBQVcsRUFBRSxlQUFlO29CQUM1QixlQUFlLEVBQUUsYUFBYTtvQkFDOUIsbUJBQW1CLEVBQUUsZUFBZ0IsQ0FBQyxFQUFFO29CQUN4QyxJQUFJLEVBQUU7d0JBQ0osS0FBSyxFQUFFLFNBQVM7d0JBQ2hCLFdBQVcsRUFBRSxtQkFBbUI7d0JBQ2hDLElBQUksRUFBRSxTQUFTO3FCQUNoQjtvQkFDRCxNQUFNLEVBQUU7d0JBQ04sRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7d0JBQ25DLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtxQkFDcEM7b0JBQ0QsS0FBSyxFQUFFO3dCQUNMLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTt3QkFDaEUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtxQkFDM0Q7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7U0FBTSxDQUFDO1FBQ04sTUFBTSxDQUFDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCwwQkFBMEI7SUFDMUIsdUNBQXVDO0lBQ3ZDLDBCQUEwQjtJQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLENBQUM7SUFDbkQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLE1BQU0sRUFBRSx1QkFBdUIsRUFBRSxHQUFHLE1BQU0sSUFBQSxrQ0FBcUIsRUFDckUsU0FBUyxDQUNWLENBQUMsR0FBRyxDQUFDO1lBQ0osS0FBSyxFQUFFO2dCQUNMLFFBQVEsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQzthQUN0RTtTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0saUJBQWlCLEdBQUcsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckQsTUFBTSxJQUFBLDhDQUFpQyxFQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUNyRCxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1NBQ3RFLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUCxNQUFNLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVELE1BQU0sSUFBQSxxREFBd0MsRUFBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDNUQsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7S0FDbEUsQ0FBQyxDQUFDO0lBRUgsMEJBQTBCO0lBRTFCLDBCQUEwQjtJQUMxQiw0REFBNEQ7SUFDNUQsMEJBQTBCO0lBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUNBQW1DLENBQUMsQ0FBQztJQUVqRCxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0lBRS9ELElBQUksQ0FBQyxZQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDNUIsTUFBTSxJQUFJLEtBQUssQ0FDYixpREFBaUQsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUN6RSxDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBWUQsd0VBQXdFO0lBQ3hFLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFTLEVBQWlCLEVBQUU7UUFDekQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO1FBQ2hFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDO0lBQ3hCLENBQUMsQ0FBQztJQUVGLE1BQU0sYUFBYSxHQUFHLElBQUk7U0FDdkIsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDaEMsTUFBTSxDQUFDLE9BQU8sQ0FBQztTQUNmLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQztTQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFakIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixJQUFJLGFBQWEsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNwRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDZixNQUFNLENBQUMsSUFBSSxDQUNULHdHQUF3RyxDQUN6RyxDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBUyxFQUFFLEdBQVcsRUFBVyxFQUFFO1FBQ2xELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM5QyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDOUMsT0FBTyxDQUNMLENBQUMsS0FBSyxPQUFPO1lBQ2IsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDdkIsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUN2Qyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ2pDLENBQUM7SUFDSixDQUFDLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRyxDQUFDLENBQVMsRUFBMkMsRUFBRTtRQUMxRSxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEMsTUFBTSxJQUFJLEdBQWMsT0FBTyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFFL0QsSUFBSSxNQUFNO1lBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFFekMsa0VBQWtFO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM1QyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM3QyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRWxGLElBQUksU0FBUyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQzFCLE1BQU0sUUFBUSxHQUFHLElBQUksS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ3RELE9BQU87Z0JBQ0wsR0FBRyxFQUFFLDhCQUE4QixTQUFTLElBQUksUUFBUSxXQUFXLFFBQVEsR0FBRyxHQUFHLEVBQUU7Z0JBQ25GLElBQUk7YUFDTCxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDO0lBRUYsTUFBTSxjQUFjLEdBQW9CLEVBQUUsQ0FBQztJQUMzQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3JCLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNyQyxJQUFJLENBQUMsS0FBSztZQUFFLFNBQVM7UUFFckIsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sQ0FBQyxJQUFJLENBQ1Qsd0VBQXdFLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FDN0osQ0FBQztZQUNGLFNBQVM7UUFDWCxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEQsSUFBSSxDQUFDLFVBQVU7WUFBRSxTQUFTO1FBRTFCLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEIsR0FBRyxDQUFDO1lBQ0osVUFBVSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ3hCLFVBQVU7WUFDVixjQUFjLEVBQUUsT0FBTyxDQUFDLEdBQUc7WUFDM0Isb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRTtZQUNoRCxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRTtTQUN2QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLGlFQUFpRSxDQUFDLENBQUM7SUFDckYsQ0FBQztJQUVELDJEQUEyRDtJQUMzRCxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztJQUN2RCxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7SUFFcEMsS0FBSyxNQUFNLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNuQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDbEMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUNELFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsMEJBQTBCO0lBQzFCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3hFLElBQUksY0FBYyxHQUFHLE1BQU0sb0JBQW9CLENBQUMscUJBQXFCLENBQUM7UUFDcEUsSUFBSSxFQUFFLGdCQUF1QjtLQUM5QixDQUFDLENBQUM7SUFFSCxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLE1BQU0sWUFBWSxHQUFHLGdCQUFnQjtTQUNsQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3ZDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUU5QyxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUM7WUFDSCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFBLDRDQUErQixFQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFDdEUsS0FBSyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFO2FBQzVDLENBQUMsQ0FBQztZQUNILGNBQWMsR0FBRyxDQUFDLEdBQUcsY0FBYyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUFDLE9BQU8sQ0FBTSxFQUFFLENBQUM7WUFDaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25FLGNBQWMsR0FBRyxNQUFNLG9CQUFvQixDQUFDLHFCQUFxQixDQUFDO2dCQUNoRSxJQUFJLEVBQUUsZ0JBQXVCO2FBQzlCLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFZLEVBQVUsRUFBRTtRQUNyQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQyxNQUFNLElBQUksR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQztRQUNoRixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVO1FBRXBDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDL0QsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDNUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFL0MsaUNBQWlDO1FBQ2pDLElBQUksQ0FBQyxHQUFHO1lBQUUsR0FBRyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVsQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVCxNQUFNLElBQUksS0FBSyxDQUFDLHNEQUFzRCxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFDRCxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7SUFDaEIsQ0FBQyxDQUFDO0lBRUYsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFhLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFM0UsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQVMsRUFBaUIsRUFBRTtRQUNyRCw0RUFBNEU7UUFDNUUsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDcEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDeEMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLDZCQUE2QixFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQztJQUVGLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsRUFBVSxFQUFFO1FBQ25FLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JDLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsS0FBSyxPQUFPO1lBQUUsT0FBTyxRQUFRLENBQUM7UUFDcEUsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUFFLE9BQU8sTUFBTSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUNwQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFBRSxPQUFPLE9BQU8sQ0FBQztRQUM5RCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDLENBQUM7SUFFRixxRkFBcUY7SUFDckYsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLEVBQUUsT0FBaUIsRUFBRSxFQUFFO1FBQ3pELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFDbkMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU1RCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07WUFBRSxPQUFPLEdBQUcsQ0FBQztRQUUvQixJQUFJLENBQUM7WUFDSCxNQUFNLFFBQVEsR0FBRyxNQUFNLG9CQUFvQixDQUFDLFlBQVksQ0FBQztnQkFDdkQsTUFBTSxFQUFFLE1BQWE7YUFDdEIsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxNQUFNLENBQUMsSUFBSSxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxFQUFFLE1BQU07b0JBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLENBQUM7WUFDRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFBQyxPQUFPLENBQU0sRUFBRSxDQUFDO1lBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsNEVBQTRFLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5RyxDQUFDO1FBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUM7Z0JBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEUsS0FBSyxNQUFNLENBQUMsSUFBSSxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7b0JBQy9CLElBQUksQ0FBQyxFQUFFLE1BQU07d0JBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN0QyxDQUFDO1lBQ0gsQ0FBQztZQUFDLE9BQU8sQ0FBTSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsc0NBQXNDLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDOUUsQ0FBQztRQUNILENBQUM7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQztJQUVGLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUV0RSxTQUFTO0lBQ1Qsc0RBQXNEO0lBQ3RELHNFQUFzRTtJQUN0RSwwRUFBMEU7SUFDMUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixJQUFJLFVBQVUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBRXpFLE1BQU0sZ0JBQWdCLEdBQVUsRUFBRSxDQUFDO0lBQ25DLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQztJQUVqQyxpRUFBaUU7SUFDakUsTUFBTSxxQkFBcUIsR0FBRyxLQUFLLEVBQUUsUUFBYSxFQUFFLEtBQVUsRUFBRSxFQUFFO1FBQ2hFLE1BQU0sS0FBSyxHQUFRO1lBQ2pCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDOUIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztZQUMxQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7WUFDeEIsMkdBQTJHO1lBQzNHLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVk7U0FDakMsQ0FBQztRQUVGLElBQUksQ0FBQztZQUNILE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsUUFBUSxDQUFDLE1BQU0sTUFBTSxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNoQixNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixRQUFRLENBQUMsTUFBTSxNQUFNLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRixDQUFDO0lBQ0gsQ0FBQyxDQUFDO0lBRUYsS0FBSyxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVsQyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssT0FBTyxDQUFDLENBQUM7UUFDekYsTUFBTSxLQUFLLEdBQUcsYUFBYSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4QyxNQUFNLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUV6QyxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQ3RCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQ2xGLENBQUM7UUFDRixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQ3RCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQ2xGLENBQUM7UUFFRixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3ZFLE1BQU0sV0FBVyxHQUFHLEdBQUcsSUFBSSxNQUFNLEtBQUssTUFBTSxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFNUYsTUFBTSxTQUFTLEdBQ2IsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNaLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3ZELElBQUksQ0FBQztRQUVQLE1BQU0sS0FBSyxHQUFRO1lBQ2pCLEtBQUs7WUFDTCxNQUFNO1lBQ04sV0FBVztZQUNYLE1BQU0sRUFBRSxxQkFBYSxDQUFDLFNBQVM7WUFDL0IsbUJBQW1CLEVBQUUsZUFBZ0IsQ0FBQyxFQUFFO1lBQ3hDLFlBQVksRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixNQUFNLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFDLFNBQVMsRUFBRSxTQUFTLElBQUksU0FBUztZQUNqQyxRQUFRLEVBQUU7Z0JBQ1IsSUFBSTtnQkFDSixLQUFLO2dCQUNMLEtBQUs7Z0JBQ0wsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDbkQ7WUFDRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDakUsUUFBUSxFQUFFO2dCQUNSO29CQUNFLEtBQUssRUFBRSxJQUFJO29CQUNYLEdBQUcsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLFdBQVcsRUFBRTtvQkFDakMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtvQkFDdkIsTUFBTSxFQUFFLHFCQUFxQixDQUMzQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO3dCQUN6RSxDQUFDLENBQUMsRUFBRTt3QkFDSixDQUFDLENBQUMsRUFBRSxDQUNQO2lCQUNGO2dCQUNEO29CQUNFLEtBQUssRUFBRSxHQUFHO29CQUNWLEdBQUcsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRTtvQkFDaEMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtvQkFDdEIsTUFBTSxFQUFFLHFCQUFxQixDQUMzQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO3dCQUN6RSxDQUFDLENBQUMsRUFBRTt3QkFDSixDQUFDLENBQUMsRUFBRSxDQUNQO2lCQUNGO2dCQUNEO29CQUNFLEtBQUssRUFBRSxHQUFHO29CQUNWLEdBQUcsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRTtvQkFDaEMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtvQkFDdEIsTUFBTSxFQUFFLHFCQUFxQixDQUMzQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO3dCQUN6RSxDQUFDLENBQUMsRUFBRTt3QkFDSixDQUFDLENBQUMsRUFBRSxDQUNQO2lCQUNGO2dCQUNEO29CQUNFLEtBQUssRUFBRSxHQUFHO29CQUNWLEdBQUcsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRTtvQkFDaEMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtvQkFDdEIsTUFBTSxFQUFFLHFCQUFxQixDQUMzQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO3dCQUN6RSxDQUFDLENBQUMsRUFBRTt3QkFDSixDQUFDLENBQUMsRUFBRSxDQUNQO2lCQUNGO2dCQUNEO29CQUNFLEtBQUssRUFBRSxJQUFJO29CQUNYLEdBQUcsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLFdBQVcsRUFBRTtvQkFDakMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtvQkFDdkIsTUFBTSxFQUFFLHFCQUFxQixDQUMzQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO3dCQUN6RSxDQUFDLENBQUMsRUFBRTt3QkFDSixDQUFDLENBQUMsRUFBRSxDQUNQO2lCQUNGO2FBQ0Y7U0FDRixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDYixJQUFJLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLE1BQU0sOENBQThDLENBQUMsQ0FBQztnQkFDOUUsU0FBUztZQUNYLENBQUM7WUFDRCxJQUFJLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzdDLFNBQVM7WUFDWCxDQUFDO1lBQ0QsV0FBVztZQUNYLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxXQUFXLENBQUMsTUFBTSxvREFBb0QsQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sSUFBQSxtQ0FBc0IsRUFBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDMUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRTtTQUNqRCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksZ0JBQWdCLENBQUMsTUFBTSx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQztZQUNILE1BQU0sSUFBQSxtQ0FBc0IsRUFBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQzFDLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRTthQUN0QyxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUFDLE9BQU8sQ0FBTSxFQUFFLENBQUM7WUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxFQUFFLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztJQUNILENBQUM7U0FBTSxDQUFDO1FBQ04sTUFBTSxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCwwQkFBMEI7SUFDMUIscUVBQXFFO0lBQ3JFLDBCQUEwQjtJQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7SUFDdkQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLE1BQU0sb0JBQW9CLENBQUMsOEJBQThCLENBQUM7UUFDaEYsS0FBSyxFQUFFLGlCQUFpQjtLQUNsQixDQUFDLENBQUM7SUFFVixJQUFJLGVBQWUsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0lBRTNDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNyQixNQUFNLFdBQVcsR0FBRyxNQUFNLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDO1lBQ3RFLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRTtTQUN4RCxDQUFDLENBQUM7UUFDSCxlQUFlLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRUQsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwQixNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sc0JBQXNCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFckUsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRTVELElBQUksYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDZixhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FDM0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FDOUUsQ0FDRixDQUFDO1lBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLGFBQWEsQ0FBQyxNQUFNLGlDQUFpQyxDQUFDLENBQUM7UUFDakYsQ0FBQzthQUFNLENBQUM7WUFDTixNQUFNLENBQUMsSUFBSSxDQUFDLG1EQUFtRCxDQUFDLENBQUM7UUFDbkUsQ0FBQztJQUNILENBQUM7SUFHRCxtREFBbUQ7SUFDbkQsMEJBQTBCO0lBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUMzQyxNQUFNLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUNqRCxNQUFNLEVBQUUsZ0JBQWdCO1FBQ3hCLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQztLQUNmLENBQUMsQ0FBQztJQUVILElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzFCLE1BQU0sZUFBZSxHQUFnQyxjQUFjLENBQUMsR0FBRyxDQUNyRSxDQUFDLEVBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkIsV0FBVyxFQUFFLGFBQWEsQ0FBQyxFQUFFO1lBQzdCLGdCQUFnQixFQUFFLE9BQU87WUFDekIsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLEVBQUU7U0FDekIsQ0FBQyxDQUNILENBQUM7UUFFRixJQUFJLENBQUM7WUFDSCxNQUFNLElBQUEsMENBQTZCLEVBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUNqRCxLQUFLLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUU7YUFDN0MsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLG1EQUFtRCxDQUFDLENBQUM7UUFDbkUsQ0FBQztJQUNILENBQUM7SUFFRCwwQkFBMEI7SUFHMUIsTUFBTSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0RBQWtELENBQUMsQ0FBQztJQUNoRSxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0lBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUM7QUFDbEUsQ0FBQyJ9