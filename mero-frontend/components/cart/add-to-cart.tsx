'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { addItem } from 'components/cart/actions';
import { useProduct } from 'components/product/product-context';
import { NoiseBackground } from 'components/ui/noise-background';
import { Product, ProductVariant } from 'lib/shopify/types';
import { useActionState } from 'react';
import { useCart } from './cart-context';

function SubmitButton({
  availableForSale,
  selectedVariantId
}: {
  availableForSale: boolean;
  selectedVariantId: string | undefined;
}) {
  const buttonClasses =
    'relative flex w-full items-center justify-center rounded-full bg-accent/80 cursor-pointer p-4 tracking-wide text-background';
  const disabledClasses = 'cursor-not-allowed opacity-60 hover:opacity-60';

  if (!availableForSale) {
    return (
      <NoiseBackground containerClassName="w-full rounded-full overflow-hidden" speed={0.05} noiseIntensity={0.1}>
        <button disabled className={clsx(buttonClasses, disabledClasses, "relative z-10 w-full h-full")}>
          Out Of Stock
        </button>
      </NoiseBackground>
    );
  }

  if (!selectedVariantId) {
    return (
      <NoiseBackground containerClassName="w-full rounded-full overflow-hidden" speed={0.05} noiseIntensity={0.1}>
        <button
          aria-label="Please select an option"
          disabled
          className={clsx(buttonClasses, disabledClasses, "relative z-10 w-full h-full")}
        >
          <div className="absolute left-0 ml-4">
            <PlusIcon className="h-5" />
          </div>
          Add To Cart
        </button>
      </NoiseBackground>
    );
  }

  return (
    <NoiseBackground containerClassName="w-full rounded-full  overflow-hidden" speed={0.05} noiseIntensity={0.1}>
      <button
        aria-label="Add to cart"
        className={clsx(buttonClasses, "relative z-10 w-full h-full", {
          'hover:opacity-90': true
        })}
      >
        <div className="absolute left-0 ml-4">
          <PlusIcon className="h-5" />
        </div>
        Add To Cart
      </button>
    </NoiseBackground>
  );
}

export function AddToCart({ product }: { product: Product }) {
  const { variants, availableForSale } = product;
  const { addCartItem } = useCart();
  const { state } = useProduct();
  const [message, formAction] = useActionState(addItem, null);

  const variant = variants.find((variant: ProductVariant) =>
    variant.selectedOptions.every(
      (option) => option.value === state[option.name.toLowerCase()]
    )
  );
  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined;
  const selectedVariantId = variant?.id || defaultVariantId;
  const addItemAction = formAction.bind(null, selectedVariantId);
  const finalVariant = variants.find(
    (variant) => variant.id === selectedVariantId
  )!;

  return (
    <form
      action={async () => {
        addCartItem(finalVariant, product);
        addItemAction();
      }}
    >
      <SubmitButton
        availableForSale={availableForSale}
        selectedVariantId={selectedVariantId}
      />
      <p aria-live="polite" className="sr-only" role="status">
        {message}
      </p>
    </form>
  );
}
