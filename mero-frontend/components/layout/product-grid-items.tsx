import Grid from 'components/grid';
import FlipCard from 'components/grid/flip-card';
import { Product } from 'lib/shopify/types';

export default function ProductGridItems({ products }: { products: Product[] }) {
  return (
    <>
      {products.map((product) => (
        <Grid.Item key={product.handle} className="animate-fadeIn">
          <FlipCard product={product} />
        </Grid.Item>
      ))}
    </>
  );
}
