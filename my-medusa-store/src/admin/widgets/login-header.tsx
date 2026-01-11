import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Heading } from "@medusajs/ui"

const LoginHeader = () => {
    return (
        <div className="flex flex-col items-center justify-center p-4 mb-4 google-sans-login">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Arsenal+SC:ital,wght@0,400;0,700;1,400;1,700&family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=Google+Sans:opsz,wght,GRAD@17..18,451,56&family=Scheherazade+New:wght@400;500;600;700&display=swap');
                
                .google-sans-login {
                    font-family: "Google Sans", sans-serif !important;
                }
                
                /* Apply to the whole page as requested */
                body {
                    font-family: "Google Sans", sans-serif !important;
                }
                
                .google-sans-login * {
                    font-family: "Google Sans", sans-serif !important;
                }
            `}</style>
            <Heading level="h1" className="text-2xl font-400 text-ui-fg-subtle text-center uppercase tracking-widest">
                MERO CLOSET DASHBOARD
            </Heading>
        </div>
    )
}

export const config = defineWidgetConfig({
    zone: "login.before",
})

export default LoginHeader
