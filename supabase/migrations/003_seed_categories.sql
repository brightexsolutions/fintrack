-- ============================================================
-- FinTrack: Seed Default Categories Migration 003
-- Run AFTER 002_rls.sql
-- ============================================================

INSERT INTO public.categories (name, type, icon, color, is_default, sort_order) VALUES
  -- Income
  ('Salary',            'income',  'briefcase',    '#10B981', true, 1),
  ('Freelance',         'income',  'laptop',       '#06B6D4', true, 2),
  ('Business',          'income',  'building-2',   '#8B5CF6', true, 3),
  ('Investment',        'income',  'trending-up',  '#F59E0B', true, 4),
  ('Rental',            'income',  'home',         '#6366F1', true, 5),
  ('Gift Received',     'income',  'gift',         '#EC4899', true, 6),
  ('Refund',            'income',  'refresh-cw',   '#84CC16', true, 7),
  ('Other Income',      'income',  'circle',       '#6B7280', true, 8),
  -- Expense
  ('Food & Dining',     'expense', 'utensils',     '#EF4444', true, 10),
  ('Transport',         'expense', 'car',          '#F97316', true, 11),
  ('Shopping',          'expense', 'shopping-bag', '#EC4899', true, 12),
  ('Entertainment',     'expense', 'film',         '#8B5CF6', true, 13),
  ('Bills & Utilities', 'expense', 'zap',          '#F59E0B', true, 14),
  ('Healthcare',        'expense', 'heart',        '#EF4444', true, 15),
  ('Education',         'expense', 'book-open',    '#06B6D4', true, 16),
  ('Travel',            'expense', 'map-pin',      '#10B981', true, 17),
  ('Personal Care',     'expense', 'smile',        '#EC4899', true, 18),
  ('Airtime & Data',    'expense', 'smartphone',   '#6366F1', true, 20),
  ('M-Pesa Charges',    'expense', 'credit-card',  '#6B7280', true, 21),
  -- Both
  ('Savings Transfer',  'both',    'piggy-bank',   '#10B981', true, 19),
  ('Other',             'both',    'circle',       '#6B7280', true, 22);
