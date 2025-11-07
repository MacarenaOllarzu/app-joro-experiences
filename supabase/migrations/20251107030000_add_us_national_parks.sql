
-- Insert category for national parks if it doesn't exist
INSERT INTO public.categories (id, name, slug, icon)
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Naturaleza', 'naturaleza', '🌲')
ON CONFLICT (slug) DO NOTHING;

-- Insert US National Parks objective
INSERT INTO public.objectives (id, category_id, title, description, image_url, total_items)
VALUES (
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440001',
  'Parques Nacionales de Estados Unidos',
  'Descubre los 63 parques nacionales de Estados Unidos, desde el majestuoso Grand Canyon hasta el salvaje Yellowstone. Cada parque ofrece paisajes únicos y experiencias inolvidables en la naturaleza.',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  20
);

-- Insert popular US National Parks as objective items
INSERT INTO public.objective_items (objective_id, name, latitude, longitude, order_index)
VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'Yellowstone National Park', 44.427963, -110.588455, 1),
  ('550e8400-e29b-41d4-a716-446655440010', 'Grand Canyon National Park', 36.106965, -112.112997, 2),
  ('550e8400-e29b-41d4-a716-446655440010', 'Yosemite National Park', 37.865101, -119.538330, 3),
  ('550e8400-e29b-41d4-a716-446655440010', 'Zion National Park', 37.297817, -113.026161, 4),
  ('550e8400-e29b-41d4-a716-446655440010', 'Rocky Mountain National Park', 40.342751, -105.683669, 5),
  ('550e8400-e29b-41d4-a716-446655440010', 'Acadia National Park', 44.338974, -68.273430, 6),
  ('550e8400-e29b-41d4-a716-446655440010', 'Olympic National Park', 47.802085, -123.604290, 7),
  ('550e8400-e29b-41d4-a716-446655440010', 'Grand Teton National Park', 43.790427, -110.681733, 8),
  ('550e8400-e29b-41d4-a716-446655440010', 'Glacier National Park', 48.759613, -113.787022, 9),
  ('550e8400-e29b-41d4-a716-446655440010', 'Great Smoky Mountains National Park', 35.611763, -83.489548, 10),
  ('550e8400-e29b-41d4-a716-446655440010', 'Bryce Canyon National Park', 37.593038, -112.187088, 11),
  ('550e8400-e29b-41d4-a716-446655440010', 'Arches National Park', 38.733081, -109.592514, 12),
  ('550e8400-e29b-41d4-a716-446655440010', 'Joshua Tree National Park', 33.873415, -115.900993, 13),
  ('550e8400-e29b-41d4-a716-446655440010', 'Sequoia National Park', 36.486427, -118.565506, 14),
  ('550e8400-e29b-41d4-a716-446655440010', 'Death Valley National Park', 36.505300, -117.079506, 15),
  ('550e8400-e29b-41d4-a716-446655440010', 'Everglades National Park', 25.286614, -80.898651, 16),
  ('550e8400-e29b-41d4-a716-446655440010', 'Crater Lake National Park', 42.868710, -122.168424, 17),
  ('550e8400-e29b-41d4-a716-446655440010', 'Mount Rainier National Park', 46.879967, -121.726906, 18),
  ('550e8400-e29b-41d4-a716-446655440010', 'Shenandoah National Park', 38.292675, -78.679390, 19),
  ('550e8400-e29b-41d4-a716-446655440010', 'Mesa Verde National Park', 37.184968, -108.489311, 20);
