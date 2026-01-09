'use client';

import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export function AnimatedThemeToggler({ className }: { className?: string }) {
    const [isDark, setIsDark] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // Sync with html class
        const updateTheme = () => {
            // We check document.documentElement.classList for 'dark'
            const isDarkMode = document.documentElement.classList.contains('dark');
            setIsDark(isDarkMode);
        };

        updateTheme();

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    const toggleTheme = useCallback(() => {
        const toggle = () => {
            const newThemeIsDark = !isDark;
            setIsDark(newThemeIsDark);
            if (newThemeIsDark) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                document.cookie = "theme=dark; path=/; max-age=31536000";
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
                document.cookie = "theme=light; path=/; max-age=31536000";
            }
        };

        // @ts-ignore
        if (!document.startViewTransition || typeof document.startViewTransition !== 'function') {
            toggle();
            return;
        }

        // @ts-ignore
        document.startViewTransition(async () => {
            flushSync(() => {
                toggle();
            });
        }).ready.then(() => {
            if (!buttonRef.current) return;

            const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
            const x = left + width / 2;
            const y = top + height / 2;
            const maxRadius = Math.hypot(
                Math.max(left, window.innerWidth - left),
                Math.max(top, window.innerHeight - top)
            );

            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0px at ${x}px ${y}px)`,
                        `circle(${maxRadius}px at ${x}px ${y}px)`,
                    ],
                },
                {
                    duration: 400,
                    easing: 'ease-in-out',
                    // @ts-ignore
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        }).catch(() => {
            // Fallback if animation fails
        });

    }, [isDark]);

    return (
        <button
            ref={buttonRef}
            onClick={toggleTheme}
            className={clsx(
                'relative flex h-10 cursor-pointer w-10 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-black dark:hover:bg-neutral-900',
                className
            )}
            aria-label="Toggle theme"
        >
            {isDark ? (
                <MoonIcon className="h-5 w-5" />
            ) : (
                <SunIcon className="h-5 w-5" />
            )}
        </button>
    );
}
