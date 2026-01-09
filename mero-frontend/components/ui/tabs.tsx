'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from 'lib/utils';

type TabsContextType = {
    value: string;
    onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

export function Tabs({
    defaultValue,
    value: controlledValue,
    onValueChange,
    className,
    children,
    ...props
}: {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
} & React.ComponentProps<'div'>) {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '');
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = React.useCallback(
        (newValue: string) => {
            if (!isControlled) {
                setUncontrolledValue(newValue);
            }
            onValueChange?.(newValue);
        },
        [isControlled, onValueChange]
    );

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div className={cn('w-full', className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

export function TabsList({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'inline-flex h-10 items-center justify-center rounded-md bg-neutral-100 p-1 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
                className
            )}
            {...props}
        />
    );
}

export function TabsTrigger({
    value,
    className,
    children,
    ...props
}: { value: string } & React.ComponentProps<'button'>) {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error('TabsTrigger must be used within Tabs');

    const isActive = context.value === value;

    return (
        <button
            onClick={() => context.onValueChange(value)}
            className={cn(
                'relative inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                isActive ? 'text-foreground' : 'hover:text-foreground/80',
                className
            )}
            {...props}
        >
            {isActive && (
                <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-sm bg-white shadow-sm dark:bg-neutral-700"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
            )}
            <span className="relative z-10">{children}</span>
        </button>
    );
}

export function TabContents({ className, children, ...props }: React.ComponentProps<'div'>) {
    const context = React.useContext(TabsContext);
    const activeChild = React.Children.toArray(children).find(
        (child) => React.isValidElement(child) && (child as React.ReactElement<any>).props.value === context?.value
    );

    return (
        <div className={cn('mt-2 relative overflow-hidden', className)} {...props}>
            <AnimatePresence mode="wait">
                {activeChild && React.cloneElement(activeChild as React.ReactElement<any>, {
                    key: context?.value
                })}
            </AnimatePresence>
        </div>
    );
}

export function TabsContent({
    value,
    className,
    children,
    ...props
}: { value: string } & React.ComponentPropsWithoutRef<'div'>) {
    // Cast to any for motion div to bypass strict event type conflicts in Motion 12 / React 19
    const motionProps: any = {
        initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
        transition: { type: 'spring', stiffness: 300, damping: 32 },
        className: cn('focus-visible:outline-none', className),
        ...props
    };

    return (
        <motion.div {...motionProps}>
            {children}
        </motion.div>
    );
}
