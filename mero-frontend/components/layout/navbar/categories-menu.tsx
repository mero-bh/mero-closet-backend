'use client';

import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Menu as MenuType } from 'lib/shopify/types';
import Link from 'next/link';
import { Fragment } from 'react';

export default function CategoriesMenu({ menu }: { menu: MenuType[] }) {
    if (!menu.length) return null;

    return (
        <div className="hidden md:block">
            <Menu as="div" className="relative inline-block text-left">
                <div>
                    <Menu.Button className="inline-flex w-full items-center justify-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-background bg-border-hover">
                        Categories
                        <ChevronDownIcon className="-mr-1 mt-1 h-5 w-5 text-background/60" aria-hidden="true" />
                    </Menu.Button>
                </div>

                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items className="absolute left-0 z-50 mt-2 w-56 origin-top-left divide-y divide-background rounded-md shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-300 focus:outline-none bg-background ring-opacity-10">
                        <div className="py-1">
                            {menu.map((item) => (
                                <Menu.Item key={item.title}>
                                    {({ active }) => (
                                        <Link
                                            href={item.path}
                                            className={clsx(
                                                active ? 'bg-selection transition-all duration-300 ease-in-out' : 'text-foreground',
                                                'block px-4 py-2 text-sm'
                                            )}
                                        >
                                            {item.title}
                                        </Link>
                                    )}
                                </Menu.Item>
                            ))}
                        </div>
                    </Menu.Items>
                </Transition>
            </Menu>
        </div>
    );
}
