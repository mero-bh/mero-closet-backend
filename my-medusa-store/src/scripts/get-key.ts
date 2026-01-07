import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function getPubKey({ container }: ExecArgs) {
    const apiKeyService = container.resolve(Modules.API_KEY)
    const keys = await apiKeyService.listApiKeys({ title: "Webshop" })
    if (keys.length > 0) {
        console.log(`KEY_FOUND: ${keys[0].token}`)
    } else {
        console.log("KEY_NOT_FOUND")
    }
}
