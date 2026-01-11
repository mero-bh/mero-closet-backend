import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Heading } from "@medusajs/ui"
import Logo from "./logo.png"

const LoginHeader = () => {
    return (
        <div className="flex flex-col items-center justify-center p-0 mb-2 google-sans-login">
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
            <Heading level="h1" className="text-xl font-400 text-ui-fg-subtle text-center uppercase tracking-widest mb-2">
                MERO CLOSET DASHBOARD
            </Heading>
            <div className="flex items-center justify-center">
                <img src={Logo} alt="Mero Closet Logo" className="w-16 h-16 object-contain opacity-90" />
            </div>
        </div>
    )
}

export const config = defineWidgetConfig({
    zone: "login.before",
})

export default LoginHeader
