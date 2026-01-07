'use client';

import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useRef, useEffect, useState, useCallback } from 'react';

export function CarouselClient({ children }: { children: React.ReactNode }) {
    const listRef = useRef<HTMLUListElement>(null);
    const [isPaused, setIsPaused] = useState(false);

    const scrollLeft = useCallback(() => {
        if (listRef.current) {
            listRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    }, []);

    const scrollRight = useCallback(() => {
        if (listRef.current) {
            // Check if we're at the end to loop back or just scroll
            const { scrollLeft, scrollWidth, clientWidth } = listRef.current;
            // If we are close to the end, scroll back to start for a loop effect
            // Note: The infinite loop logic in the parent component essentially duplicates items, 
            // but for a truly infinite scroll we might need more complex logic. 
            // For now, we just scroll right.
            if (scrollLeft + clientWidth >= scrollWidth - 10) {
                listRef.current.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                listRef.current.scrollBy({ left: 300, behavior: 'smooth' });
            }
        }
    }, []);

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            scrollRight();
        }, 3000);

        return () => clearInterval(interval);
    }, [isPaused, scrollRight]);

    return (
        <div
            className="group relative w-full overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            <ul
                ref={listRef}
                className="flex animate-carousel gap-4 overflow-x-auto pb-6 pt-1 scroll-smooth scrollbar-hide snap-x snap-mandatory"
            >
                {children}
            </ul>

            {/* Navigation Buttons - Hidden by default, shown on group-hover */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <button
                    onClick={scrollLeft}
                    aria-label="Scroll Left"
                    className="pointer-events-auto flex h-10 w-10 transform items-center justify-center rounded-full border border-neutral-200 bg-background/80 text-foreground backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-background dark:border-neutral-800"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <button
                    onClick={scrollRight}
                    aria-label="Scroll Right"
                    className="pointer-events-auto flex h-10 w-10 transform items-center justify-center rounded-full border border-neutral-200 bg-background/80 text-foreground backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-background dark:border-neutral-800"
                >
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
