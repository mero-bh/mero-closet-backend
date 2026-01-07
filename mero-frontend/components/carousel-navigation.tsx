'use client';

import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export function CarouselNavigation() {
    const router = useRouter();

    const scrollLeft = () => {
        const list = document.querySelector('ul.animate-carousel');
        if (list) {
            list.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        const list = document.querySelector('ul.animate-carousel');
        if (list) {
            list.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    return (
        <div className="flex justify-end gap-2 pr-4 pt-2">
            <button
                onClick={scrollLeft}
                aria-label="Scroll Left"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-background text-foreground transition-all hover:bg-neutral-100/50 dark:border-neutral-800 dark:hover:bg-neutral-800"
            >
                <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <button
                onClick={scrollRight}
                aria-label="Scroll Right"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-background text-foreground transition-all hover:bg-neutral-100/50 dark:border-neutral-800 dark:hover:bg-neutral-800"
            >
                <ArrowRightIcon className="h-4 w-4" />
            </button>
        </div>
    );
}
