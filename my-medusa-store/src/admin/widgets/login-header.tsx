import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Heading } from "@medusajs/ui"

const LoginHeader = () => {
    return (
        <div className="flex flex-col items-center justify-center p-4 mb-4">
            <Heading level="h1" className="text-2xl font-bold text-ui-fg-base text-center uppercase tracking-widest">
                MERO CLOSET DASHBOARD
            </Heading>
        </div>
    )
}

export const config = defineWidgetConfig({
    zone: "login.before",
})

export default LoginHeader
