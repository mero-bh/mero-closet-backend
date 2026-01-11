import {
    createProductsWorkflow,
    updateProductsWorkflow,
    deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ProductStatus, Modules } from "@medusajs/framework/utils"

type CurrencyCode = "bhd" | "sar" | "aed"

function slugify(input: string) {
    const base = (input || "").toLowerCase().trim()
    const slug = base.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
    return slug.length ? slug : `product-${Date.now()}`
}

/**
 * Medusa pricing expects integer minor units.
 * BHD: 3 decimals, SAR/AED: 2 decimals.
 */
function toMinorUnits(amount: number, currency: CurrencyCode) {
    const n = Number(amount)
    if (!Number.isFinite(n)) return 0

    const decimalsMap: Record<CurrencyCode, number> = {
        bhd: 3,
        sar: 2,
        aed: 2,
    }

    const decimals = decimalsMap[currency] ?? 2
    const factor = Math.pow(10, decimals)
    return Math.round(n * factor)
}

export const aiTools = [
    {
        functionDeclarations: [
            {
                name: "create_product",
                description:
                    "Create a new product. If description is missing, the agent should analyze the image first.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        title: { type: "STRING" },
                        description: { type: "STRING" },
                        price: { type: "NUMBER" },
                        category_name: { type: "STRING" },
                        images: {
                            type: "ARRAY",
                            description: "List of image URLs",
                            items: { type: "STRING" },
                        },
                    },
                    required: ["title", "price"],
                },
            },
            {
                name: "update_product_price",
                description: "Update the price of an existing product.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        handle: {
                            type: "STRING",
                            description: "The unique handle (slug) of the product",
                        },
                        new_price: { type: "NUMBER", description: "The new price in BHD" },
                    },
                    required: ["handle", "new_price"],
                },
            },
            {
                name: "get_store_info",
                description:
                    "Get general information about the store, such as available categories, sales channels, and regions.",
                parameters: { type: "OBJECT", properties: {} },
            },
            {
                name: "list_products",
                description: "List products in the store to find handles or status.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        q: { type: "STRING", description: "Search query" },
                    },
                },
            },
            {
                name: "delete_product",
                description: "Delete a product from the store by its ID.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        id: { type: "STRING", description: "The unique ID of the product" },
                    },
                    required: ["id"],
                },
            },
            {
                name: "update_product",
                description:
                    "Update a product. If description is missing, the agent should analyze the image first.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        title: { type: "STRING" },
                        description: { type: "STRING" },
                        price: { type: "NUMBER" },
                        category_name: { type: "STRING" },
                        images: {
                            type: "ARRAY",
                            description: "List of image URLs",
                            items: { type: "STRING" },
                        },
                    },
                    required: ["title", "price"],
                },
            },
            {
                name: "create_reel",
                description: "Create a new Reel/Story from an image URL.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caption: { type: "STRING" },
                        url: { type: "STRING" },
                    },
                    required: ["url"],
                },
            },
            {
                name: "change_dashboard_language",
                description: "Change the language of the admin dashboard.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        language_code: {
                            type: "STRING",
                            description: "The language code (e.g., 'ar' for Arabic, 'en' for English)",
                        },
                    },
                    required: ["language_code"],
                },
            },
            {
                name: "navigate_to",
                description: "Navigate the admin dashboard to a specific page.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        path: {
                            type: "STRING",
                            description:
                                "The internal path (e.g., '/products', '/orders', '/settings', '/products/create')",
                        },
                    },
                    required: ["path"],
                },
            },
            {
                name: "get_documentation",
                description: "Get documentation and help for Medusa 2.0 concepts.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        topic: {
                            type: "STRING",
                            description: "Topic to search (products, orders, customers, pricing)",
                        },
                    },
                },
            },
            {
                name: "list_customers",
                description: "List registered customers.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                },
            },
            {
                name: "list_orders",
                description: "List recent orders.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                },
            },
        ],
    },
]

export const executeTool = async (name: string, args: any, container: any) => {
    console.log(`EXECUTING TOOL: ${name}`, args)

    try {
        if (name === "get_store_info") {
            const productModuleService = container.resolve(Modules.PRODUCT)
            const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
            const regionService = container.resolve(Modules.REGION)

            const [categories, salesChannels, regions] = await Promise.all([
                productModuleService.listProductCategories({}, { select: ["id", "name", "handle"] }),
                salesChannelService.listSalesChannels({}, { select: ["id", "name"] }),
                regionService.listRegions({}, { select: ["id", "name", "currency_code"] }),
            ])

            return {
                success: true,
                categories,
                salesChannels,
                regions,
                message: `Retrieved store info: ${categories.length} categories, ${salesChannels.length} sales channels.`,
            }
        }

        if (name === "list_products") {
            const { q = "" } = args
            const productModuleService = container.resolve(Modules.PRODUCT)

            const [products] = await productModuleService.listAndCountProducts(
                q ? { q } : {},
                { select: ["id", "title", "handle", "status"], take: 5 }
            )

            return { success: true, products, message: `Found ${products.length} products.` }
        }

        if (name === "create_product") {
            const { title, description, price, category_name = "Abayas", images = [] } = args

            const productModuleService = container.resolve(Modules.PRODUCT)
            const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
            const fulfillmentService = container.resolve(Modules.FULFILLMENT)

            // 1) Try "Default" first (as filters)
            let [shippingProfiles, salesChannels, categories] = await Promise.all([
                fulfillmentService.listShippingProfiles({ name: "Default" }),
                salesChannelService.listSalesChannels({ name: "Default" }),
                productModuleService.listProductCategories({ name: category_name }),
            ])

            // 2) Fallbacks: get ANY (pagination must be in config, not filters)
            if (!shippingProfiles || shippingProfiles.length === 0) {
                shippingProfiles = await fulfillmentService.listShippingProfiles({}, { take: 1 })
            }

            if (!salesChannels || salesChannels.length === 0) {
                salesChannels = await salesChannelService.listSalesChannels({}, { take: 1 })
            }

            const shippingProfileId = shippingProfiles?.[0]?.id
            const salesChannelId = salesChannels?.[0]?.id
            const categoryId = categories?.[0]?.id

            if (!shippingProfileId) {
                return {
                    success: false,
                    message:
                        "No shipping profiles found. Create one in Settings > Shipping, then try again.",
                }
            }

            // 3) Workflow
            const workflow = createProductsWorkflow(container)
            const handle = slugify(title)

            const bhd = toMinorUnits(price, "bhd")
            const sar = toMinorUnits(price * 10, "sar")
            const aed = toMinorUnits(price * 9.75, "aed")

            const sizes = ["S", "M", "L", "XL"]

            const { result } = await workflow.run({
                input: {
                    products: [
                        {
                            title,
                            description: description || "No description provided",
                            handle,
                            images: (images || []).map((url: string) => ({ url })),
                            status: ProductStatus.PUBLISHED,
                            shipping_profile_id: shippingProfileId,
                            sales_channels: salesChannelId ? [{ id: salesChannelId }] : undefined,
                            category_ids: categoryId ? [categoryId] : undefined,

                            // Keep it simple but valid
                            options: [{ title: "Size", values: sizes }],

                            variants: sizes.map((size) => ({
                                title: size,
                                sku: `${handle}-${size}-${Date.now()}`,
                                options: { Size: size },
                                prices: [
                                    { currency_code: "bhd", amount: bhd },
                                    { currency_code: "sar", amount: sar },
                                    { currency_code: "aed", amount: aed },
                                ],
                            })),
                        },
                    ],
                },
            })

            return {
                success: true,
                product: result[0],
                message: `Successfully created product '${title}'.`,
            }
        }

        if (name === "update_product_price") {
            const { handle, new_price } = args
            const productModuleService = container.resolve(Modules.PRODUCT)

            const [product] = await productModuleService.listProducts(
                { handle },
                { relations: ["variants"] }
            )

            if (!product) {
                return { success: false, message: `Product with handle '${handle}' not found.` }
            }

            return {
                success: true,
                message: `Found '${product.title}'. Price update flow not implemented yet for v2 workflows in this tool.`,
            }
        }

        if (name === "delete_product") {
            const { id } = args
            const workflow = deleteProductsWorkflow(container)
            await workflow.run({ input: { ids: [id] } })
            return { success: true, message: `Successfully deleted product with ID: ${id}.` }
        }

        if (name === "create_reel") {
            const { caption = "New AI Reel", url } = args
            const pool = container.resolve("pg_connection")

            await pool.query(
                `INSERT INTO reels (file_url, caption, duration, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
                [url, caption, 5]
            )

            return { success: true, message: `Created new Reel with caption: ${caption}` }
        }

        if (name === "change_dashboard_language") {
            const { language_code } = args
            return {
                success: true,
                message: `Setting dashboard language to ${String(language_code).toUpperCase()}.`,
                action: "LANGUAGE_CHANGE",
                code: language_code,
            }
        }

        if (name === "navigate_to") {
            const { path } = args
            return {
                success: true,
                message: `Navigating to ${path}...`,
                action: "NAVIGATE",
                path,
            }
        }

        if (name === "get_documentation") {
            const { topic } = args

            const docs: Record<string, string> = {
                products:
                    "Products in Medusa 2.0 are managed via the Product Module. They have variants, options, and prices. Admin Path: /products",
                orders:
                    "Orders track purchases. They can be fulfilled, canceled, or returned. Admin Path: /orders",
                customers: "Customers are users who place orders. You can manage them at /customers",
                pricing: "Prices are region-specific. Ensure you have a tax provider configured.",
                dashboard:
                    "The dashboard allows full control over the store. You can manage settings at /settings.",
            }

            const key = String(topic || "").toLowerCase()
            const info =
                docs[key] ||
                "General Medusa 2.0 Documentation: Medusa is a modular commerce engine. Admin URL structure: /products, /orders, /customers, /settings."

            return {
                success: true,
                topic,
                content: info,
                message: `Found documentation for: ${topic || "General"}`,
            }
        }

        if (name === "list_orders") {
            return { success: true, orders: [], message: "Orders retrieved (Mock: No orders found)." }
        }

        if (name === "list_customers") {
            try {
                const customerModule = container.resolve(Modules.CUSTOMER)
                const [customers, count] = await customerModule.listAndCountCustomers({}, { take: 5 })
                return { success: true, customers, count, message: `Found ${count} customers.` }
            } catch (e: any) {
                return { success: false, message: `Could not list customers: ${e.message}` }
            }
        }
    } catch (error: any) {
        console.error(`TOOL ERROR [${name}]:`, error)
        return { success: false, message: `Failed to execute ${name}: ${error.message}` }
    }

    return { success: false, message: "Unknown tool" }
}
