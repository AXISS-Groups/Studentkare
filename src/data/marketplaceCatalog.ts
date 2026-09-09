export type ProductCategory = 'vitamins' | 'skin' | 'diabetes' | 'devices' | 'nutrition' | 'first-aid' | 'ayurveda' | 'medicines' | 'labs';
export type CatalogSort = 'featured' | 'price-low' | 'price-high' | 'rating' | 'discount';
export type ArtworkShape = 'bottle' | 'tube' | 'box' | 'device' | 'jar' | 'lab';

export interface CatalogItem {
  id: string;
  kind: 'product' | 'lab';
  name: string;
  brand: string;
  category: ProductCategory;
  pack: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  color: string;
  shape: ArtworkShape;
  artLabel: string;
  description: string;
  highlights: string[];
  requiresPrescription?: boolean;
  tests?: number;
  preparation?: string;
}

// Fictional brands, sample prices, and illustrative ratings. No live inventory.
export const catalog: CatalogItem[] = [
  { id: 'vitamin-c', kind: 'product', name: 'Vitamin C + Zinc Daily Support', brand: 'Nourish', category: 'vitamins', pack: 'Bottle of 60 tablets', price: 349, mrp: 499, rating: 4.6, reviews: 128, color: '#e4a03e', shape: 'bottle', artLabel: 'Vitamin C', description: 'An illustrative vitamin and mineral supplement for the demo wellness catalog.', highlights: ['60-tablet sample pack', 'Vitamin C and zinc product category', 'Check suitability with a healthcare professional'] },
  { id: 'sunscreen', kind: 'product', name: 'Daily Defence Sunscreen SPF 50', brand: 'Kindskin', category: 'skin', pack: 'Tube of 50 g cream', price: 429, mrp: 599, rating: 4.8, reviews: 246, color: '#e9a89b', shape: 'tube', artLabel: 'SPF 50', description: 'A fictional everyday sunscreen with a light-texture product concept.', highlights: ['SPF 50 sample product', '50 g travel-friendly pack', 'See the real product label for application instructions'] },
  { id: 'omega', kind: 'product', name: 'Omega 3 Essential Softgels', brand: 'Nourish', category: 'vitamins', pack: 'Bottle of 60 softgels', price: 599, mrp: 899, rating: 4.5, reviews: 94, color: '#5d93a7', shape: 'bottle', artLabel: 'Omega 3', description: 'A sample omega supplement listing to explore product discovery and ordering.', highlights: ['60-softgel sample pack', 'Dietary supplement category', 'Review ingredients and allergies before real-world use'] },
  { id: 'glucometer', kind: 'product', name: 'SmartCheck Blood Glucose Monitor', brand: 'CareSense', category: 'diabetes', pack: 'Kit with 10 sample strips', price: 799, mrp: 1299, rating: 4.4, reviews: 172, color: '#6c7cbd', shape: 'device', artLabel: 'SmartCheck', description: 'An illustrative home glucose-monitoring kit. Device readings in this demo are not measurements.', highlights: ['Meter and strip kit concept', 'Large digital display', 'Follow manufacturer instructions for a real device'] },
  { id: 'protein', kind: 'product', name: 'Everyday Plant Protein · Cocoa', brand: 'Nourish', category: 'nutrition', pack: 'Jar of 500 g powder', price: 899, mrp: 1199, rating: 4.6, reviews: 86, color: '#8c7865', shape: 'jar', artLabel: 'Plant protein', description: 'A cocoa-flavoured plant protein concept for the demo nutrition range.', highlights: ['500 g sample jar', 'Plant-based nutrition category', 'Check ingredients for allergens'] },
  { id: 'moisturiser', kind: 'product', name: 'Barrier Care Daily Moisturiser', brand: 'Kindskin', category: 'skin', pack: 'Tube of 100 ml lotion', price: 279, mrp: 399, rating: 4.7, reviews: 183, color: '#95b8ad', shape: 'tube', artLabel: 'Barrier care', description: 'A fictional gentle moisturiser designed for this sample skincare collection.', highlights: ['100 ml sample tube', 'Everyday skincare category', 'Patch-test an actual product before use'] },
  { id: 'first-aid', kind: 'product', name: 'Everyday First Aid Dressing Kit', brand: 'Kare Essentials', category: 'first-aid', pack: 'Box of 20 dressings', price: 149, mrp: 199, rating: 4.5, reviews: 76, color: '#c88781', shape: 'box', artLabel: 'First aid', description: 'A sample dressing kit for a personal first-aid cupboard.', highlights: ['20 assorted sample dressings', 'Compact box concept', 'For urgent injuries, seek appropriate medical care'] },
  { id: 'thermometer', kind: 'product', name: 'Flexi Digital Thermometer', brand: 'CareSense', category: 'devices', pack: 'Box of 1 device', price: 229, mrp: 349, rating: 4.4, reviews: 112, color: '#65a6aa', shape: 'device', artLabel: 'Digital temp', description: 'A sample digital thermometer listing. The illustration is not a live temperature reading.', highlights: ['Digital device concept', 'Single-device sample pack', 'Follow the actual device manual'] },
  { id: 'herbal-tea', kind: 'product', name: 'Tulsi & Ginger Herbal Infusion', brand: 'Root & Ritual', category: 'ayurveda', pack: 'Box of 25 tea bags', price: 199, mrp: 299, rating: 4.6, reviews: 68, color: '#8fa477', shape: 'box', artLabel: 'Tulsi + ginger', description: 'A caffeine-free herbal infusion concept for a quiet moment in your day.', highlights: ['25 tea bags in the sample box', 'Tulsi and ginger flavour concept', 'Check suitability and ingredients before use'] },
  { id: 'multivitamin', kind: 'product', name: 'Daily Multivitamin Essentials', brand: 'Nourish', category: 'vitamins', pack: 'Bottle of 30 tablets', price: 299, mrp: 449, rating: 4.5, reviews: 207, color: '#9d8bbb', shape: 'bottle', artLabel: 'Daily multi', description: 'An illustrative multivitamin listing for the wellness marketplace.', highlights: ['30-tablet sample pack', 'Vitamin and mineral category', 'Not a substitute for a varied diet'] },
  { id: 'electrolyte', kind: 'product', name: 'Everyday Electrolyte Mix · Orange', brand: 'Kare Essentials', category: 'nutrition', pack: 'Box of 10 sachets', price: 179, mrp: 249, rating: 4.3, reviews: 59, color: '#df9f61', shape: 'box', artLabel: 'Electrolytes', description: 'A sample hydration-product listing with fictional packaging.', highlights: ['10-sachet sample box', 'Orange flavour concept', 'Follow preparation instructions on a real product'] },
  { id: 'prescription-pack', kind: 'product', name: 'Prescription Care Pack · Demo Only', brand: 'Kare Essentials', category: 'medicines', pack: 'Illustrative prescription item', price: 120, mrp: 150, rating: 4.5, reviews: 24, color: '#8a9dc3', shape: 'box', artLabel: 'Rx care', requiresPrescription: true, description: 'A fictional item that demonstrates the prescription step. It contains no real medicine or dosage recommendation.', highlights: ['Requires the sample prescription step', 'No real medication is sold or dispatched', 'Actual prescriptions require licensed pharmacy review'] },
  { id: 'full-body', kind: 'lab', name: 'Complete Health Checkup', brand: 'Kare Labs', category: 'labs', pack: 'Includes 72 parameters', price: 1499, mrp: 2999, rating: 4.8, reviews: 320, color: '#8f7dc4', shape: 'lab', artLabel: 'Full body', tests: 72, preparation: 'Sample preparation: 8–10 hours fasting. Confirm with the actual lab.', description: 'A sample preventive-health package combining commonly requested blood panels.', highlights: ['Blood count, liver, and kidney panels', 'Lipid and blood-sugar parameters', 'Illustrative report time: 24 hours'] },
  { id: 'vitamin-panel', kind: 'lab', name: 'Vitamin D & B12 Check', brand: 'Kare Labs', category: 'labs', pack: 'Includes 2 parameters', price: 899, mrp: 1599, rating: 4.7, reviews: 156, color: '#daa475', shape: 'lab', artLabel: 'Vitamin check', tests: 2, preparation: 'Sample preparation: no fasting. Confirm instructions with the actual lab.', description: 'An illustrative lab package for vitamin D and vitamin B12 measurements.', highlights: ['Vitamin D measurement', 'Vitamin B12 measurement', 'Illustrative report time: 48 hours'] },
  { id: 'thyroid', kind: 'lab', name: 'Thyroid Profile', brand: 'Kare Labs', category: 'labs', pack: 'Includes 3 parameters', price: 399, mrp: 699, rating: 4.6, reviews: 218, color: '#7ba4a8', shape: 'lab', artLabel: 'Thyroid care', tests: 3, preparation: 'Sample preparation: confirm collection time and medication instructions with your clinician.', description: 'A sample thyroid profile listing for exploring the diagnostics booking journey.', highlights: ['T3, T4, and TSH parameters', 'Home sample collection concept', 'Illustrative report time: 24 hours'] },
  { id: 'diabetes-panel', kind: 'lab', name: 'Diabetes Care Checkup', brand: 'Kare Labs', category: 'labs', pack: 'Includes 8 parameters', price: 599, mrp: 999, rating: 4.7, reviews: 194, color: '#bd8b9e', shape: 'lab', artLabel: 'Diabetes care', tests: 8, preparation: 'Sample preparation: fasting may be required. Confirm with the actual lab.', description: 'An illustrative blood-sugar checkup package. Tests should be selected with appropriate clinical advice.', highlights: ['HbA1c and blood-glucose parameters', 'Sample collection concept', 'Illustrative report time: 24 hours'] },
];

export const categories: { id: ProductCategory; label: string; color: string; productId: string }[] = [
  { id: 'vitamins', label: 'Vitamins & nutrition', color: '#f8ead3', productId: 'vitamin-c' },
  { id: 'skin', label: 'Skin & hair care', color: '#fae6e5', productId: 'sunscreen' },
  { id: 'diabetes', label: 'Diabetes care', color: '#e9e9f8', productId: 'glucometer' },
  { id: 'devices', label: 'Health devices', color: '#e1f0f0', productId: 'thermometer' },
  { id: 'nutrition', label: 'Fitness & protein', color: '#f0e8df', productId: 'protein' },
  { id: 'ayurveda', label: 'Ayurveda & herbs', color: '#e8efdf', productId: 'herbal-tea' },
  { id: 'first-aid', label: 'First aid essentials', color: '#f6e5e1', productId: 'first-aid' },
  { id: 'medicines', label: 'Medicines', color: '#e5eaf5', productId: 'prescription-pack' },
];

export const catalogBrands = ['Nourish', 'Kindskin', 'CareSense', 'Root & Ritual', 'Kare Essentials'];
export const itemById = (id: string) => catalog.find(item => item.id === id);
export const discountPercent = (item: CatalogItem) => Math.round((1 - item.price / item.mrp) * 100);

export function filterCatalog({ query = '', category = 'all', brand = 'all', kind = 'all', sort = 'featured' }: {
  query?: string;
  category?: ProductCategory | 'all';
  brand?: string;
  kind?: 'product' | 'lab' | 'all';
  sort?: CatalogSort;
} = {}) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const items = catalog.filter(item => {
    const searchable = `${item.name} ${item.brand} ${item.category} ${item.pack}`.toLowerCase();
    return terms.every(term => searchable.includes(term))
      && (category === 'all' || item.category === category)
      && (brand === 'all' || item.brand === brand)
      && (kind === 'all' || item.kind === kind);
  });
  if (sort === 'price-low') items.sort((a, b) => a.price - b.price);
  if (sort === 'price-high') items.sort((a, b) => b.price - a.price);
  if (sort === 'rating') items.sort((a, b) => b.rating - a.rating);
  if (sort === 'discount') items.sort((a, b) => discountPercent(b) - discountPercent(a));
  return items;
}

export const wellnessArticles = [
  { id: 'sleep', tag: 'EVERYDAY WELLBEING', title: 'A little less scrolling. A little more sleep.', color: '#e9e4f5', readTime: '3 min read', body: ['A repeatable wind-down routine can make bedtime feel less rushed. Try a quiet activity that you enjoy and keep the room comfortable.', 'Notice how caffeine, late meals, and screen time affect your own routine. Small, sustainable changes can be easier to keep than a complete reset.', 'If sleep problems are persistent or affect daily life, speak with a qualified healthcare professional.'] },
  { id: 'checkup', tag: 'PREVENTIVE CARE', title: 'Your first health checkup, made simpler.', color: '#e3f0e9', readTime: '4 min read', body: ['Before booking, ask a clinician which tests are appropriate for your age, history, and concerns. More tests are not automatically better.', 'Confirm preparation, sample collection, and report timing with the laboratory. Bring relevant prescriptions and previous reports.', 'Review results with a qualified clinician rather than interpreting an isolated number on its own.'] },
  { id: 'skincare', tag: 'SKIN & SELF-CARE', title: 'Keep your everyday skincare simple.', color: '#f7e8df', readTime: '3 min read', body: ['A simple routine is often easier to follow consistently. Choose products suited to your skin and introduce changes gradually.', 'Read product labels, check ingredients, and patch-test new products. Stop using a product if it causes irritation.', 'For persistent skin concerns, consult a dermatologist instead of repeatedly adding new products.'] },
];
