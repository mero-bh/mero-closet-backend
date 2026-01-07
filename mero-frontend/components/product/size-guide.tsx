'use client';

import { Dialog, Tab, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Image from 'next/image';
import { Fragment, useEffect, useState } from 'react';

export default function SizeGuide() {
    const [isOpen, setIsOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [measurements, setMeasurements] = useState({
        length: '',
        width: '',
        sleeve: ''
    });

    useEffect(() => {
        // Check initial theme
        const checkTheme = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        checkTheme();

        // Observer for theme changes
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        // Load saved measurements
        const saved = localStorage.getItem('user_measurements');
        if (saved) {
            setMeasurements(JSON.parse(saved));
        }

        return () => observer.disconnect();
    }, []);

    const saveMeasurements = () => {
        localStorage.setItem('user_measurements', JSON.stringify(measurements));
        alert('Measurements saved successfully!');
        setIsOpen(false);
    };

    const images = [
        { name: 'Abaya Style', dark: '/tiler/1.png', light: '/tiler/1-light.png' },
        { name: 'Coat Style', dark: '/tiler/2.png', light: '/tiler/2-light.png' },
        { name: 'Casual Style', dark: '/tiler/3.png', light: '/tiler/3-light.png' }
    ];

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="mt-4 flex w-full items-center justify-center rounded-full border border-neutral-200 bg-white p-3 text-sm font-medium text-black transition-all hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
            >
                <span>📏 Size Guide & My Measurements</span>
            </button>

            <Transition show={isOpen} as={Fragment}>
                <Dialog onClose={() => setIsOpen(false)} className="relative z-[100]">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
                    </Transition.Child>

                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
                                <div className="flex items-center justify-between mb-4">
                                    <Dialog.Title className="text-xl cursor-pointer font-medium text-black dark:text-white">
                                        Size Guide & Measurements
                                    </Dialog.Title>
                                    <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Image Tabs */}
                                    <div className="flex-1">
                                        <Tab.Group>
                                            <Tab.List className="flex space-x-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
                                                {images.map((img) => (
                                                    <Tab
                                                        key={img.name}
                                                        className={({ selected }) =>
                                                            clsx(
                                                                'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
                                                                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                                                selected
                                                                    ? 'bg-white text-black shadow dark:bg-neutral-700 dark:text-white'
                                                                    : 'text-neutral-600 hover:bg-white/[0.12] hover:text-black dark:text-neutral-400 dark:hover:text-white'
                                                            )
                                                        }
                                                    >
                                                        {img.name}
                                                    </Tab>
                                                ))}
                                            </Tab.List>
                                            <Tab.Panels className="mt-4">
                                                {images.map((img, idx) => (
                                                    <Tab.Panel key={idx} className="rounded-xl bg-neutral-50 p-2 dark:bg-neutral-800/50">
                                                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                                                            <Image
                                                                src={isDark ? img.dark : img.light}
                                                                alt={img.name}
                                                                fill
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    </Tab.Panel>
                                                ))}
                                            </Tab.Panels>
                                        </Tab.Group>
                                    </div>

                                    {/* Measurement Form */}
                                    <div className="w-full lg:w-80 flex-none space-y-6">
                                        <div className="rounded-xl bg-neutral-50 p-6 dark:bg-neutral-800">
                                            <h3 className="mb-4 text-lg font-medium text-black dark:text-white">Your Measurements</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">
                                                        Length (cm/inch)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={measurements.length}
                                                        onChange={(e) => setMeasurements({ ...measurements, length: e.target.value })}
                                                        className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                                                        placeholder="e.g. 52"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">
                                                        Width (cm/inch)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={measurements.width}
                                                        onChange={(e) => setMeasurements({ ...measurements, width: e.target.value })}
                                                        className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                                                        placeholder="e.g. 22"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">
                                                        Sleeve (cm/inch)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={measurements.sleeve}
                                                        onChange={(e) => setMeasurements({ ...measurements, sleeve: e.target.value })}
                                                        className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                                                        placeholder="e.g. 26"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={saveMeasurements}
                                                className="mt-6 w-full rounded-full bg-blue-600 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-95"
                                            >
                                                Save Measurements
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}
