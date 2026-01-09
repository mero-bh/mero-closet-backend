import { AddToCart } from 'components/cart/add-to-cart';
import Price from 'components/price';
import { ProductProvider } from 'components/product/product-context';
import { Product } from 'lib/shopify/types';
import Link from 'next/link';
import { GridTileImage } from './tile';

export default function FlipCard({ product }: { product: Product }) {
    return (
        <ProductProvider>
            {/* Mobile: Standard Clickable Tile */}
            <div className="md:hidden w-full mb-4">
                <Link href={`/product/${product.handle}`} className="block h-[350px] sm:h-[400px]">
                    <GridTileImage
                        alt={product.title}
                        src={product.featuredImage?.url}
                        fill
                        label={{
                            title: product.title,
                            amount: product.priceRange.maxVariantPrice.amount,
                            currencyCode: product.priceRange.maxVariantPrice.currencyCode,
                        }}
                        sizes="(min-width: 640px) 50vw, 100vw"
                    />
                </Link>
            </div>

            {/* Desktop: 3D Flip Card */}
            <div className="hidden md:block group h-[450px] w-full [perspective:1000px] mb-4">
                <div className="relative h-full w-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                    {/* Front */}
                    <div className="absolute inset-0 h-full w-full [backface-visibility:hidden]">
                        <GridTileImage
                            alt={product.title}
                            src={product.featuredImage?.url}
                            fill
                            sizes="33vw"
                        />
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 h-full w-full [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col items-center justify-between bg-background/95 backdrop-blur-md border-3 border-accent/20 rounded-md p-8 text-center shadow-lg dark:shadow-accent/5">
                        <div className="flex flex-col items-center gap-4">
                            <Link href={`/product/${product.handle}`} className="group/title">
                                <h3 className="text-2xl font-bold text-foreground group-hover/title:text-accent transition-colors leading-snug line-clamp-2">
                                    {product.title}
                                </h3>
                            </Link>

                            <div className="bg-accent/10 px-4 py-1.5 rounded-full border border-accent/20">
                                <Price
                                    amount={product.priceRange.maxVariantPrice.amount}
                                    currencyCode={product.priceRange.maxVariantPrice.currencyCode}
                                    className="text-xl font-bold text-accent"
                                />
                            </div>
                        </div>

                        {product.description && (
                            <p className="text-foreground/60 text-sm line-clamp-3 leading-relaxed px-2">
                                {product.description}
                            </p>
                        )}

                        <div className="w-full flex flex-col gap-5">
                            <div className="w-full max-w-[220px] mx-auto">
                                <AddToCart product={product} />
                            </div>

                            <Link
                                href={`/product/${product.handle}`}
                                className="text-xs font-bold text-foreground/40 hover:text-accent transition-colors uppercase tracking-[0.2em]"
                            >
                                Product Details
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </ProductProvider>
    );
}
