'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { addItem } from 'components/cart/actions';
import { useProduct } from 'components/product/product-context';
import LoadingThreeDotsJumping from 'components/ui/loading-dots';
import { Pointer } from 'components/ui/pointer';
import StarBorder from 'components/ui/starborder-button';
import { Product, ProductVariant } from 'lib/shopify/types';
import { useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './cart-context';

function SubmitButton({
  availableForSale,
  selectedVariantId,
  isPending
}: {
  availableForSale: boolean;
  selectedVariantId: string | undefined;
  isPending: boolean;
}) {
  const buttonBaseClasses = 'w-full h-full flex items-center justify-center';
  const disabledClasses = 'cursor-not-allowed opacity-60';

  if (!availableForSale) {
    return (
      <StarBorder
        disabled
        className={clsx(buttonBaseClasses, disabledClasses)}
        color="gray"
      >
        Out Of Stock
      </StarBorder>
    );
  }

  if (!selectedVariantId) {
    return (

      <StarBorder
        disabled
        aria-label="Please select an option"
        className={clsx(buttonBaseClasses, disabledClasses)}
        color="gray"
        >
        <div className="absolute left-0 ml-4">
          <PlusIcon className="h-5" />
        </div>
        Add To Cart
      </StarBorder>
    );
  }

  return (
    <StarBorder
      aria-label="Add to cart"
      className={clsx(buttonBaseClasses, 'hover:opacity-90 transition-opacity transition-all duration-300')}
      color="var(--color-accent)"
      speed="3s"
      disabled={isPending}
      type="submit"
    >
      <Pointer className="text-2xl">💖</Pointer>
      {isPending ? (
        <LoadingThreeDotsJumping />
      ) : (
        <>
          <div className="absolute transition-all duration-300 ease-in-out hover:translate-y-1 hover:text-background left-0 ml-4">
            <PlusIcon className="h-5" />
          </div>
          Add To Cart
        </>
      )}
    </StarBorder>
  );
}

export function AddToCart({ product }: { product: Product }) {
  const { variants, availableForSale } = product;
  const { addCartItem } = useCart();
  const { state } = useProduct();
  const [message, formAction, isPending] = useActionState(addItem, null);
  const router = useRouter();
  const [isTransitioning, startTransition] = useTransition();

  const variant = variants.find((variant: ProductVariant) =>
    variant.selectedOptions.every(
      (option) => option.value === state[option.name.toLowerCase()]
    )
  );
  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined;
  const selectedVariantId = variant?.id || defaultVariantId;
  const finalVariant = variants.find(
    (variant) => variant.id === selectedVariantId
  )!;

  const action = () => {
    startTransition(async () => {
      if (finalVariant) {
        addCartItem(finalVariant, product);
      }
      await formAction(selectedVariantId);
      router.refresh();
    });
  };

  return (
    <form action={action} className="w-full">
      <SubmitButton
        availableForSale={availableForSale}
        selectedVariantId={selectedVariantId}
        isPending={isPending || isTransitioning}
      />
      <p aria-live="polite" className="sr-only" role="status">
        {message}
      </p>
    </form>
  );
}
