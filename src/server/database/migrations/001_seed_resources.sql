-- Migración 001: recursos fundamentales por defecto (sección 20 del documento).
-- time: horas disponibles por semana · money: unidades monetarias disponibles
-- energy/focus: porcentaje 0-100

INSERT INTO resources (id, type, available, capacity, unit) VALUES
  ('res-time',   'time',   40, 40, 'h/semana'),
  ('res-money',  'money',  0,  0,  'USD'),
  ('res-energy', 'energy', 80, 100, '%'),
  ('res-focus',  'focus',  75, 100, '%')
ON CONFLICT (id) DO NOTHING;
