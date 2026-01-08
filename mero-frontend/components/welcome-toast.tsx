'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function WelcomeToast() {
  useEffect(() => {
    // ignore if screen height is too small
    if (window.innerHeight < 650) return;
    if (!document.cookie.includes('welcome-toast=2')) {
      toast('🛍️ Welcome to Mero Closet!', {
        id: 'welcome-toast',
        duration: Infinity,
        onDismiss: () => {
          document.cookie = 'welcome-toast=2; max-age=31536000; path=/';
        },
        description: (
          <>
            this is a abaya shop by Shopify, Next.js, and Vercel.{' '}
            <a
              href="https://mero-closet-frontend-ui.vercel.app/New-Collections"
              className="text-blue-600 hover:underline"
              target="_blank"
            >
              check our New Collections
            </a>
            .
          </>
        )
      });
    }
  }, []);

  return null;
}
