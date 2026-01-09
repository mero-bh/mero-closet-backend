import { auth, signOut } from 'auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { UserIcon, EnvelopeIcon, ShieldCheckIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const { user } = session;

    return (
        <div className="flex min-h-[90vh] flex-col items-center justify-start px-4 py-12 md:py-20">
            <div className="w-full max-w-2xl space-y-8">
                {/* Header Section */}
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="relative group">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-25 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200" />
                        <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-2xl dark:border-neutral-900">
                            {user.image ? (
                                <Image
                                    src={user.image}
                                    alt={user.name || 'User'}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                                    <UserIcon className="h-16 w-16 text-neutral-400" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
                            {user.name}
                        </h1>
                        <p className="text-neutral-500 dark:text-neutral-400">Account Member</p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-center space-x-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                                <EnvelopeIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Email Address</p>
                                <p className="font-semibold text-neutral-900 dark:text-white">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-center space-x-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                <ShieldCheckIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Account Role</p>
                                <p className="font-semibold text-neutral-900 dark:text-white capitalize">
                                    {/* @ts-ignore */}
                                    {user.role || 'User'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white/50 p-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/50">
                    <Link
                        href="/"
                        className="flex items-center justify-between rounded-2xl p-4 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                        <span className="font-medium">Continue Shopping</span>
                        <ArrowLeftOnRectangleIcon className="h-5 w-5 rotate-180" />
                    </Link>

                    <form
                        action={async () => {
                            'use server';
                            await signOut({ redirectTo: '/' });
                        }}
                    >
                        <button
                            type="submit"
                            className="flex w-full items-center justify-between rounded-2xl p-4 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/10"
                        >
                            <span className="font-medium">Sign Out</span>
                            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                        </button>
                    </form>
                </div>

                {/* Premium Footer Hint */}
                <p className="text-center text-xs text-neutral-400">
                    Mero Closet Premium Customer Portal &bull; Secured by Auth.js
                </p>
            </div>
        </div>
    );
}
