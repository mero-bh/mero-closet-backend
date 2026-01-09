'use client';

import clsx from 'clsx';
import { Menu } from 'lib/shopify/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function FooterMenuItem({ item }: { item: Menu }) {
  const pathname = usePathname();
  const [active, setActive] = useState(pathname === item.path);

  useEffect(() => {
    setActive(pathname === item.path);
  }, [pathname, item.path]);

  return (
    <li>
      <Link
        href={item.path}
        className={clsx(
          'block text-lg underline-offset-4 hover:text-border-hover hover:underline md:inline-block md:text-sm ',
          {
            'text-muted/80 ': active
          }
        )}
      >
        {item.title}
      </Link>
    </li>
  );
}

export default function FooterMenu({ menu }: { menu: Menu[] }) {
  if (!menu.length) return null;

  // Split menu items into chunks of 4
  const chunkSize = 4;
  const menuChunks = [];
  for (let i = 0; i < menu.length; i += chunkSize) {
    menuChunks.push(menu.slice(i, i + chunkSize));
  }

  return (
    <nav className="grid grid-cols-2 gap-8">
      {menuChunks.map((chunk, index) => (
        <ul key={index} className="flex flex-col gap-2">
          {chunk.map((item: Menu) => (
            <FooterMenuItem key={item.title} item={item} />
          ))}
        </ul>
      ))}
    </nav>
  );
}
