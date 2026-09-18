export type ProductListing = {
  id: string;
  slug: string;
  name: string;
  model: string | null;
  product_type: 'iphone' | 'accessory';
  condition: 'novo' | 'seminovo';
  featured: boolean;
  category_id: string | null;
  min_price: number;
  min_pix_price: number;
  old_price: number | null;
  installments_max: number;
  in_stock: boolean;
  cover_url: string | null;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  storage: string | null;
  color: string | null;
  price: number;
  pix_price: number | null;
  old_price: number | null;
  installments_max: number;
  active: boolean;
};

export type ProductFull = {
  id: string;
  slug: string;
  name: string;
  model: string | null;
  brand: string;
  category_id: string | null;
  product_type: 'iphone' | 'accessory';
  condition: 'novo' | 'seminovo';
  description: string | null;
  featured: boolean;
  status: string;
  specs: Record<string, string>;
  product_variants: ProductVariant[];
  product_images: { id: string; url: string; alt: string | null; position: number }[];
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  image_url: string | null;
  position: number;
};

export type OrderStatus = 'pendente' | 'aprovado' | 'preparando' | 'enviado' | 'entregue' | 'cancelado';
