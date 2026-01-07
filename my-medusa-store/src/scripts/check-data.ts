
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function checkData({ container }: ExecArgs) {
    const productModuleStr = Modules.PRODUCT
    const productModule = container.resolve(productModuleStr)

    const [collections, countColl] = await productModule.listAndCountProductCollections()
    console.log(`COLLECTIONS: ${countColl}`)
    collections.forEach(c => console.log(` - ${c.title} (${c.handle})`))

    const [categories, countCat] = await productModule.listAndCountProductCategories()
    console.log(`CATEGORIES: ${countCat}`)
    categories.forEach(c => console.log(` - ${c.name} (${c.handle})`))
}
