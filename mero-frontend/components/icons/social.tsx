import * as React from 'react';

export function GoogleIcon(props: React.ComponentProps<'svg'>) {
    return (
        <svg viewBox="0 0 24 24" {...props}>
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

export function AppleIcon(props: React.ComponentProps<'svg'>) {
    return (
        <svg viewBox="0 0 22.8 28" {...props}>
            <path d="M18.8,11.5c0-2.8,2.3-4.1,2.4-4.2c-1.3-1.9-3.3-2.2-4.1-2.2c-1.8-0.2-3.6,1.1-4.5,1.1c-0.9,0-2.3-1-3.9-1c-2.1,0-4,1.2-5.1,3.1 c-2.2,3.8-0.6,9.5,1.5,12.6c1.1,1.5,2.3,3.2,3.9,3.2c1.6,0,2.2-1,4.1-1c1.8,0,2.4,1,4.1,1c1.7,0,2.7-1.5,3.8-3.1 c1.2-1.8,1.7-3.5,1.7-3.6C22.6,18,18.8,16.6,18.8,11.5z M15.6,3.8c0.8-1,1.4-2.4,1.2-3.8c-1.2,0.1-2.6,0.8-3.5,1.9 c-0.8,0.9-1.5,2.3-1.3,3.7C13.3,5.7,14.7,4.8,15.6,3.8z" />
        </svg>
    );
}

export function InstagramIcon(props: React.ComponentProps<'svg'>) {
    return (
        <svg viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
    );
}
