'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabContents, TabsContent } from 'components/ui/tabs';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
    const [view, setView] = useState<'auth' | 'forgot-password'>('auth');
    const [email, setEmail] = useState('');

    const handleGoogleLogin = () => {
        signIn('google', { callbackUrl: '/' });
    };

    return (
        <div className="flex min-h-[90vh] items-center justify-center px-4 py-12">
            <div className="w-full max-w-[400px]">
                <AnimatePresence mode="wait">
                    {view === 'auth' ? (
                        <motion.div
                            key="auth"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
                        >
                            <div className="mb-8 text-center">
                                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                                    Welcome Back
                                </h1>
                                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                                    Select a method to continue
                                </p>
                            </div>

                            <Tabs defaultValue="login" className="w-full">
                                <TabsList className="mb-6 grid w-full grid-cols-2 rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-800">
                                    <TabsTrigger value="login" className="rounded-xl py-2.5">Login</TabsTrigger>
                                    <TabsTrigger value="signup" className="rounded-xl py-2.5">Sign Up</TabsTrigger>
                                </TabsList>

                                <TabContents>
                                    <TabsContent value="login" className="space-y-6">
                                        <div className="space-y-4">
                                            {/* Google Login Button - Dark/Light aware */}
                                            <motion.button
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={handleGoogleLogin}
                                                className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
                                            >
                                                <div className="relative h-[44px] w-full max-w-[240px]">
                                                    <Image
                                                        src="/google-button-light.svg"
                                                        alt="Sign in with Google"
                                                        fill
                                                        className="block object-contain dark:hidden"
                                                        priority
                                                    />
                                                    <Image
                                                        src="/google-button-dark.svg"
                                                        alt="Sign in with Google"
                                                        fill
                                                        className="hidden object-contain dark:block"
                                                        priority
                                                    />
                                                </div>
                                            </motion.button>

                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-white px-2 text-neutral-500 dark:bg-neutral-900">
                                                        Or continue with email
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                                                <input
                                                    type="email"
                                                    placeholder="name@example.com"
                                                    className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-neutral-900/5 dark:border-neutral-800 dark:focus:ring-white/5"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Password</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setView('forgot-password')}
                                                        className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                                                    >
                                                        Forgot password?
                                                    </button>
                                                </div>
                                                <input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-neutral-900/5 dark:border-neutral-800 dark:focus:ring-white/5"
                                                />
                                            </div>

                                            <button className="w-full rounded-xl bg-neutral-900 py-3 font-semibold text-white transition-all hover:bg-neutral-800 active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100">
                                                Login
                                            </button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="signup" className="space-y-6">
                                        <div className="space-y-4">
                                            <motion.button
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={handleGoogleLogin}
                                                className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
                                            >
                                                <div className="relative h-[44px] w-full max-w-[240px]">
                                                    <Image
                                                        src="/google-button-light.svg"
                                                        alt="Sign up with Google"
                                                        fill
                                                        className="block object-contain dark:hidden"
                                                        priority
                                                    />
                                                    <Image
                                                        src="/google-button-dark.svg"
                                                        alt="Sign up with Google"
                                                        fill
                                                        className="hidden object-contain dark:block"
                                                        priority
                                                    />
                                                </div>
                                            </motion.button>

                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-white px-2 text-neutral-500 dark:bg-neutral-900">
                                                        Create account with email
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Full Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="John Doe"
                                                    className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-neutral-900/5 dark:border-neutral-800 dark:focus:ring-white/5"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                                                <input
                                                    type="email"
                                                    placeholder="name@example.com"
                                                    className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-neutral-900/5 dark:border-neutral-800 dark:focus:ring-white/5"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Password</label>
                                                <input
                                                    type="password"
                                                    placeholder="Create a password"
                                                    className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-neutral-900/5 dark:border-neutral-800 dark:focus:ring-white/5"
                                                />
                                            </div>

                                            <button className="w-full rounded-xl bg-neutral-900 py-3 font-semibold text-white transition-all hover:bg-neutral-800 active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100">
                                                Create Account
                                            </button>
                                        </div>
                                    </TabsContent>
                                </TabContents>
                            </Tabs>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="forgot-password"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
                        >
                            <div className="mb-6 text-center">
                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Reset Password</h2>
                                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                    Enter your email and we'll send you a reset link.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-neutral-900/5 dark:border-neutral-800 dark:focus:ring-white/5"
                                        autoFocus
                                    />
                                </div>

                                <button className="w-full rounded-xl bg-neutral-900 py-3 font-semibold text-white transition-all hover:bg-neutral-800 active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100">
                                    Send Reset Link
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setView('auth')}
                                    className="w-full py-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
                                >
                                    Back to Login
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
