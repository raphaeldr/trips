-- Import Itinerary Stops
-- Refined based on flight data provided by user (Added Santiago)
-- DELETE FROM public.destinations; 

INSERT INTO public.destinations (name, country, continent, arrival_date, departure_date, latitude, longitude, is_current)
VALUES 
  -- 1. Start: Luxembourg
  ('Luxembourg', 'Luxembourg', 'Europe', '2026-02-17', '2026-02-17', 49.6116, 6.1319, true),
  
  -- 2. South America: Buenos Aires (Arr 18 Feb)
  -- Splitting time in South America roughly in half since trans-Andean travel date isn't specified
  ('Buenos Aires', 'Argentina', 'South America', '2026-02-18', '2026-03-05', -34.6037, -58.3816, false),
  
  -- 3. South America: Santiago (Dep 15 Mar)
  ('Santiago', 'Chile', 'South America', '2026-03-05', '2026-03-15', -33.4489, -70.6693, false),
  
  -- 4. North America: Mexico City (Arr 15 Mar via Panama, Dep 17 Mar)
  ('Mexico City', 'Mexico', 'North America', '2026-03-15', '2026-03-17', 19.4326, -99.1332, false),
  
  -- 5. Asia: Tokyo (Arr 18 Mar, Dep 28 Mar)
  ('Tokyo', 'Japan', 'Asia', '2026-03-18', '2026-03-28', 35.6762, 139.6503, false),
  
  -- 6. Oceania: Auckland (Arr 29 Mar, Dep 10 May)
  ('Auckland', 'New Zealand', 'Oceania', '2026-03-29', '2026-05-10', -36.8485, 174.7633, false),
  
  -- 7. Oceania: Melbourne (Arr 10 May, Dep 01 Jul inferred from Perth flight)
  ('Melbourne', 'Australia', 'Oceania', '2026-05-10', '2026-07-01', -37.8136, 144.9631, false),
  
  -- 8. Oceania: Perth (Dep 01 Jul - Transit/Anchor)
  ('Perth', 'Australia', 'Oceania', '2026-07-01', '2026-07-01', -31.9505, 115.8605, false),
  
  -- 9. Asia: Singapore (Arr 01 Jul, Dep 01 Aug)
  ('Singapore', 'Singapore', 'Asia', '2026-07-01', '2026-08-01', 1.3521, 103.8198, false),
  
  -- 10. Europe: Frankfurt (Arr 01 Aug, Dep 02 Aug)
  ('Frankfurt', 'Germany', 'Europe', '2026-08-01', '2026-08-02', 50.1109, 8.6821, false),
  
  -- 11. End: Luxembourg (Arr 02 Aug)
  ('Luxembourg', 'Luxembourg', 'Europe', '2026-08-02', NULL, 49.6116, 6.1319, false);
