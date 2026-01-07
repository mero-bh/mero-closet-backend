import clsx from 'clsx';
import Image from 'next/image';

export default function LogoSquare({ size }: { size?: 'md' | undefined }) {
  return (
    <div
      className={clsx(
        'flex flex-none items-center justify-center border border-neutral-200 dark:border-neutral-700 bg-black',
        {
          'h-[45px] w-[45px] rounded-xl': !size,
          'h-[35px] w-[35px] rounded-lg': size === 'md'
        }
      )}
    >
      <Image
        src="/logo.png"
        alt="Logo"
        width={size === 'md' ? 24 : 32}
        height={size === 'md' ? 24 : 32}
        className={clsx('object-contain', {
          'h-[34px] w-[34px]': !size,
          'h-[32px] w-[32px]': size === 'md'
        })}
      />
    </div>
  );
}
