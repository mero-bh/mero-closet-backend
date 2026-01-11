import {
    createProductsWorkflow,
    updateProductsWorkflow
} from "@medusajs/medusa/core-flows"
import { ProductStatus } from "@medusajs/framework/utils"

export const aiTools = [
    {
        functionDeclarations: [
            {
                name: "create_product",
                description: "Create a new product in the store. Useful when the user provides an image or description of a new item.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        title: { type: "STRING", description: "The name of the product" },
                        description: { type: "STRING", description: "A detailed description of the product" },
                        price: { type: "NUMBER", description: "The price of the product in BHD (Bahraini Dinar)" },
                        category_name: { type: "STRING", description: "The category name (e.g., Abayas, Sets, etc.)" }
                    },
                    required: ["title", "description", "price"]
                }
            },
            {
                name: "update_product_price",
                description: "Update the price of an existing product.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        handle: { type: "STRING", description: "The unique handle (slug) of the product" },
                        new_price: { type: "NUMBER", description: "The new price in BHD" }
                    },
                    required: ["handle", "new_price"]
                }
            },
            {
                name: "change_dashboard_language",
                description: "Change the language of the admin dashboard.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        language_code: { type: "STRING", description: "The language code (e.g., 'ar' for Arabic, 'en' for English)" }
                    },
                    required: ["language_code"]
                }
            }
        ]
    }
]

export const executeTool = async (name: string, args: any, container: any) => {
    console.log(`EXECUTING TOOL: ${name}`, args)

    if (name === "create_product") {
        const { title, description, price, category_name = "Abayas" } = args

        // In Medusa 2.0, we use workflows
        const workflow = createProductsWorkflow(container)

        const { result } = await workflow.run({
            input: {
                products: [{
                    title,
                    description,
                    status: ProductStatus.PUBLISHED,
                    options: [{ title: "Default", values: ["Default"] }],
                    variants: [{
                        title: "Default",
                        sku: `${title.toLowerCase().replace(/ /g, '-')}-${Date.now()}`,
                        prices: [
                            { currency_code: "bhd", amount: price },
                            { currency_code: "sar", amount: price * 10 }, // Basic conversion for GCC
                            { currency_code: "aed", amount: price * 9.75 }
                        ],
                        options: { Default: "Default" }
                    }]
                }]
            }
        })

        return { success: true, product: result[0], message: `Product '${title}' created successfully at ${price} BHD.` }
    }

    if (name === "update_product_price") {
        const { handle, new_price } = args
        const productModuleService = container.resolve("productModuleService")
        const [product] = await productModuleService.listProducts({ handle })

        if (!product) {
            return { success: false, message: `Product with handle '${handle}' not found.` }
        }

        // This is a bit more complex in Medusa 2.0 as prices are in a separate module/link
        // For now, let's just log it or implement a basic update if possible
        // A full price update requires updating the price set linked to the variant

        return { success: true, message: `I've identified the product '${product.title}'. (Price update logic is being finalized).` }
    }

    if (name === "change_dashboard_language") {
        const { language_code } = args
        return { success: true, message: `Setting dashboard language to ${language_code}. Please refresh if you don't see the change immediately.`, action: "LANGUAGE_CHANGE", code: language_code }
    }

    return { success: false, message: "Unknown tool" }
}
