"use client";

import { Button } from '@headlessui/react';
import React from 'react';

interface LightButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    color?: string;
}

export default function LightButton({
    children,
    onClick,
    className = "",
    color = "rgba(109, 255, 37, 0.4)"
}: LightButtonProps) {
    return (
        <Button
            onClick={onClick}
            className={`
                relative inline-flex items-center justify-center 
                rounded-full px-6 py-2 
                text-sm font-bold uppercase tracking-widest text-white
                bg-neutral-900/80 backdrop-blur-sm
                border border-white/10
                transition-all duration-300
                data-[hover]:bg-neutral-800 
                data-[active]:scale-95
                shadow-[0_0_15px_-5px_rgba(255,255,255,0.1)]
                hover:shadow-[0_0_20px_-2px_var(--glow-color)]
                ${className}
            `}
            style={{
                '--glow-color': color
            } as React.CSSProperties}
        >
            <div className="relative z-10 flex items-center gap-2">
                {children}
            </div>
            {/* Subtle inner glow */}
            <div
                className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 hover:opacity-20"
                style={{
                    boxShadow: `inset 0 0 12px ${color}`
                }}
            />
        </Button>
    );
}
