import { createServerSupabase } from '@/lib/supabase/server';

type ListingFilters = {
  productType?: 'iphone' | 'accessory';
  condition?: 'novo' | 'seminovo';
  onlyOffers?: boolean;
  categorySlug?: string;
  search?: string;
};

export async function getListing(filters: ListingFilters) {
  const supabase = createServerSupabase();
  let query = supabase.from('product_listing').select('*');

  if (filters.productType) query = query.eq('product_type', filters.productType);
  if (filters.condition) query = query.eq('condition', filters.condition);
  if (filters.onlyOffers) query = query.not('old_price', 'is', null);
  if (filters.search) query = query.ilike('name', `%${filters.search}%`);

  if (filters.categorySlug) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', filters.categorySlug).maybeSingle();
    if (cat) query = query.eq('category_id', cat.id);
  }

  const { data } = await query.order('featured', { ascending: false }).order('name');
  return data ?? [];
}
