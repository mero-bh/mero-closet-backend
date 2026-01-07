import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Text } from "@medusajs/ui"

const LoginFooter = () => {
    return (
        <div className="flex flex-col items-center justify-center p-4 mt-6">
            <Text className="text-ui-fg-subtle text-xs">
                Created By Eng.Mohamed Alromaihi
            </Text>
        </div>
    )
}

export const config = defineWidgetConfig({
    zone: "login.after",
})

export default LoginFooter
