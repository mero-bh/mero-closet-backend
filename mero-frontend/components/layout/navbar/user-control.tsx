import { UserIcon } from '@heroicons/react/24/outline';
import { auth } from 'auth';
import LightButton from 'components/ui/light-button';
import Link from 'next/link';
import Image from 'next/image';

export async function NavbarUserControl() {
    const session = await auth();

    if (!session?.user) {
        return (
            <Link href="/login" className="transition-all duration-300">
                <LightButton
                    color="rgba(109, 255, 37, 0.2)" // Subtle green glow
                    className="!px-3 !py-3 md:!px-6 md:!py-2"
                >
                    <UserIcon className="h-5 w-5 md:hidden" />
                    <span className="hidden md:block lowercase font-bold tracking-tight">Log In</span>
                </LightButton>
            </Link>
        );
    }

    return (
        <div className="flex items-center gap-2 md:gap-4">
            <Link href="/profile" className="group relative">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-purple-500 to-green-500 opacity-20 blur transition duration-300 group-hover:opacity-75" />
                <div className="relative h-8 w-8 md:h-9 md:w-9 overflow-hidden rounded-full border border-neutral-200 dark:border-neutral-800 transition-transform group-hover:scale-110 active:scale-95">
                    {session.user.image ? (
                        <Image
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                            width={36}
                            height={36}
                            className="object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                            <UserIcon className="h-5 w-5 text-neutral-400" />
                        </div>
                    )}
                </div>
            </Link>

            <div className="hidden flex-col md:flex">
                <span className="text-[11px] font-black uppercase tracking-tighter text-neutral-500">Welcome</span>
                <span className="text-xs font-bold text-foreground leading-none">{session.user.name?.split(' ')[0]}</span>
            </div>
        </div>
    );
}
