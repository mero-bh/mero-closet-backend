import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function OpenCart({
  className,
  quantity
}: {
  className?: string;
  quantity?: number;
}) {
  return (
    <div className="relative flex h-9 w-9 bg-border-hover items-center justify-center rounded-xl border border-neutral-200 transition-colors dark:border-neutral-700 ">
      <ShoppingCartIcon
        className={clsx('h-4 w-4 transition-all text-background ease-in-out hover:scale-110 cursor-pointer', className)}
      />

      {quantity ? (
        <div className="absolute right-0 top-0 -mr-2 -mt-2 h-4 w-4 rounded-sm bg-[#ffa0b6] text-[11px] font-medium text-white">
          {quantity}
        </div>
      ) : null}
    </div>
  );
}
