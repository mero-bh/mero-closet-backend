import { getCart } from 'lib/shopify';

export default async function CheckoutPage() {
  const cart = await getCart();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Checkout</h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-300">
        هني مكان صفحة الدفع. حالياً المشروع مهيّأ لعرض المنتجات والسلة،
        لكن الدفع في Medusa يحتاج إعداد مزوّد شحن + مزوّد دفع وربط خطوات الـ checkout.
      </p>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white/60 p-4 dark:border-neutral-700 dark:bg-black/30">
        <p className="text-sm">
          Cart ID: <span className="font-mono">{cart?.id || '—'}</span>
        </p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          لما تجهز Stripe/PayPal + Shipping Options، نبدّل هالصفحة لخطوات الدفع الفعلية.
        </p>
      </div>
    </div>
  );
}
