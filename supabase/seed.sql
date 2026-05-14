-- APP 4 — Shipments Tracker: seed for 6 instances × 10 shipments = 60 rows.
-- Run AFTER schema.sql. Idempotent upsert on (instance_name, tracking_number).
-- Re-run to reset to seed values.
--
-- Today (in the demo): 2026-05-13. Each instance has at least one DELAYED
-- shipment (so /api/status reports health=degraded for the demo). Some
-- estimated_arrival dates are in the past and not yet DELIVERED, showing up
-- as overdue rows. Order refs match the order_number values seeded in app-3
-- so the demo feels operationally coherent.

insert into public.shipments
  (instance_name, tracking_number, carrier, origin, destination,
   customer, order_ref, items_count, weight_kg,
   status, estimated_arrival, actual_arrival, delay_reason, notes)
values
  -- ─── Factory 1 — Dearborn, MI ───────────────────────────────────────
  ('Factory 1','TRK-F1-1001','FedEx Freight',     'Dearborn, MI','Peoria, IL',     'Caterpillar',     'ORD-F1-005',   80,  1240.50,'DELIVERED',      '2026-05-10','2026-05-10','','Wheel assemblies'),
  ('Factory 1','TRK-F1-1002','UPS Supply Chain',  'Dearborn, MI','Charlotte, NC',  'Honeywell',       'ORD-F1-006',  200,   480.00,'DELIVERED',      '2026-04-28','2026-04-25','','Sensors batch — on-time'),
  ('Factory 1','TRK-F1-1003','DHL Industrial',    'Dearborn, MI','Detroit, MI',    'Ford Motor Co',   'ORD-F1-010',  400,  3200.00,'IN_TRANSIT',     '2026-06-08',NULL,'',''),
  ('Factory 1','TRK-F1-1004','XPO Logistics',     'Dearborn, MI','Seattle, WA',    'Boeing',          'ORD-F1-009',  100,   850.00,'OUT_FOR_DELIVERY','2026-05-14',NULL,'','White-glove handling required'),
  ('Factory 1','TRK-F1-1005','J.B. Hunt',         'Dearborn, MI','Falls Church, VA','General Dynamics','ORD-F1-004',   25,  2500.00,'IN_TRANSIT',     '2026-05-20',NULL,'',''),
  ('Factory 1','TRK-F1-1006','FedEx Freight',     'Dearborn, MI','St. Paul, MN',   '3M Industrial',   'ORD-F1-007', 5000,   220.00,'PREPARING',      '2026-06-18',NULL,'',''),
  ('Factory 1','TRK-F1-1007','UPS Supply Chain',  'Dearborn, MI','Waltham, MA',    'Raytheon',        'ORD-F1-008',   30,  1850.00,'DELAYED',        '2026-05-15',NULL,'Carrier capacity shortage',''),
  ('Factory 1','TRK-F1-1008','DHL Industrial',    'Dearborn, MI','Seattle, WA',    'Boeing',          'ORD-F1-002',  200,  5400.00,'IN_TRANSIT',     '2026-05-25',NULL,'',''),
  ('Factory 1','TRK-F1-1009','XPO Logistics',     'Dearborn, MI','Fort Worth, TX', 'Lockheed Martin', 'ORD-F1-003', 1000,    95.00,'DELAYED',        '2026-05-12',NULL,'Customs hold — mil-spec inspection',''),
  ('Factory 1','TRK-F1-1010','J.B. Hunt',         'Dearborn, MI','Detroit, MI',    'Ford Motor Co',   'ORD-F1-001',   50,  4250.00,'PREPARING',      '2026-06-08',NULL,'',''),

  -- ─── Factory 2 — Wichita, KS ────────────────────────────────────────
  ('Factory 2','TRK-F2-2001','FedEx Freight',     'Wichita, KS','Seattle, WA',     'Boeing',          'ORD-F2-001',   75,  6375.00,'IN_TRANSIT',     '2026-05-25',NULL,'',''),
  ('Factory 2','TRK-F2-2002','UPS Supply Chain',  'Wichita, KS','Fort Worth, TX',  'Lockheed Martin', 'ORD-F2-002',  500,    60.00,'PREPARING',      '2026-05-28',NULL,'',''),
  ('Factory 2','TRK-F2-2003','DHL Industrial',    'Wichita, KS','Waltham, MA',     'Raytheon',        'ORD-F2-003',  150,   285.00,'OUT_FOR_DELIVERY','2026-05-19',NULL,'',''),
  ('Factory 2','TRK-F2-2004','XPO Logistics',     'Wichita, KS','Falls Church, VA','General Dynamics','ORD-F2-004',  400,  8800.00,'DELIVERED',      '2026-05-09','2026-05-11','','Customer accepted late delivery'),
  ('Factory 2','TRK-F2-2005','J.B. Hunt',         'Wichita, KS','Charlotte, NC',   'Honeywell',       'ORD-F2-005',   40,  1800.00,'DELIVERED',      '2026-04-30','2026-04-29','',''),
  ('Factory 2','TRK-F2-2006','FedEx Freight',     'Wichita, KS','Detroit, MI',     'Ford Motor Co',   'ORD-F2-006',   80,  6240.00,'PREPARING',      '2026-06-02',NULL,'',''),
  ('Factory 2','TRK-F2-2007','UPS Supply Chain',  'Wichita, KS','Peoria, IL',      'Caterpillar',     'ORD-F2-008',  120,  1920.00,'DELAYED',        '2026-05-10',NULL,'Supplier delay on sub-assembly',''),
  ('Factory 2','TRK-F2-2008','DHL Industrial',    'Wichita, KS','Seattle, WA',     'Boeing',          'ORD-F2-009',  200,   580.00,'IN_TRANSIT',     '2026-05-17',NULL,'',''),
  ('Factory 2','TRK-F2-2009','XPO Logistics',     'Wichita, KS','Charlotte, NC',   'Honeywell',       'ORD-F2-011',  100,  5250.00,'IN_TRANSIT',     '2026-05-13',NULL,'',''),
  ('Factory 2','TRK-F2-2010','J.B. Hunt',         'Wichita, KS','Waltham, MA',     'Raytheon',        'ORD-F2-012',  300,   285.00,'DELAYED',        '2026-06-08',NULL,'Weather — severe storms in MA',''),

  -- ─── Factory 3 — Cleveland, OH (many delays) ───────────────────────
  ('Factory 3','TRK-F3-3001','FedEx Freight',     'Cleveland, OH','Detroit, MI',     'Ford Motor Co',   'ORD-F3-001',  150, 21750.00,'DELAYED',        '2026-04-30',NULL,'Raw materials shortage at origin',''),
  ('Factory 3','TRK-F3-3002','UPS Supply Chain',  'Cleveland, OH','Seattle, WA',     'Boeing',          'ORD-F3-002',   30,  2550.00,'PREPARING',      '2026-06-02',NULL,'',''),
  ('Factory 3','TRK-F3-3003','DHL Industrial',    'Cleveland, OH','Peoria, IL',      'Caterpillar',     'ORD-F3-003',   50,  1600.00,'IN_TRANSIT',     '2026-06-08',NULL,'',''),
  ('Factory 3','TRK-F3-3004','XPO Logistics',     'Cleveland, OH','Fort Worth, TX',  'Lockheed Martin', 'ORD-F3-004',  800,    76.00,'DELAYED',        '2026-05-07',NULL,'Customs hold',''),
  ('Factory 3','TRK-F3-3005','J.B. Hunt',         'Cleveland, OH','Waltham, MA',     'Raytheon',        'ORD-F3-005',  100,   220.00,'PREPARING',      '2026-05-16',NULL,'',''),
  ('Factory 3','TRK-F3-3006','FedEx Freight',     'Cleveland, OH','Falls Church, VA','General Dynamics','ORD-F3-006',   15,  1500.00,'OUT_FOR_DELIVERY','2026-05-18',NULL,'',''),
  ('Factory 3','TRK-F3-3007','UPS Supply Chain',  'Cleveland, OH','Charlotte, NC',   'Honeywell',       'ORD-F3-007',   20,  1480.00,'PREPARING',      '2026-06-17',NULL,'',''),
  ('Factory 3','TRK-F3-3008','DHL Industrial',    'Cleveland, OH','St. Paul, MN',    '3M Industrial',   'ORD-F3-008', 4000,   168.00,'DELIVERED',      '2026-04-22','2026-04-22','','On-time within tolerance'),
  ('Factory 3','TRK-F3-3009','XPO Logistics',     'Cleveland, OH','Detroit, MI',     'Ford Motor Co',   'ORD-F3-009',   50,  1425.00,'IN_TRANSIT',     '2026-05-11',NULL,'',''),
  ('Factory 3','TRK-F3-3010','J.B. Hunt',         'Cleveland, OH','Fort Worth, TX',  'Lockheed Martin', 'ORD-F3-012',  250,  1500.00,'DELAYED',        '2026-05-09',NULL,'Sub-assembly defect; reshipping batch',''),

  -- ─── Factory 4 — San Antonio, TX (high throughput) ──────────────────
  ('Factory 4','TRK-F4-4001','FedEx Freight',     'San Antonio, TX','Seattle, WA',     'Boeing',          'ORD-F4-001',  120, 10200.00,'IN_TRANSIT',     '2026-05-22',NULL,'',''),
  ('Factory 4','TRK-F4-4002','UPS Supply Chain',  'San Antonio, TX','Detroit, MI',     'Ford Motor Co',   'ORD-F4-002',  600,  4800.00,'OUT_FOR_DELIVERY','2026-05-15',NULL,'',''),
  ('Factory 4','TRK-F4-4003','DHL Industrial',    'San Antonio, TX','Fort Worth, TX',  'Lockheed Martin', 'ORD-F4-003', 1500,   142.50,'DELIVERED',      '2026-05-12','2026-05-11','','On-time'),
  ('Factory 4','TRK-F4-4004','XPO Logistics',     'San Antonio, TX','Peoria, IL',      'Caterpillar',     'ORD-F4-004',  250,  8000.00,'IN_TRANSIT',     '2026-05-25',NULL,'',''),
  ('Factory 4','TRK-F4-4005','J.B. Hunt',         'San Antonio, TX','Falls Church, VA','General Dynamics','ORD-F4-005',   60,  6000.00,'DELIVERED',      '2026-05-09','2026-05-10','','1-day late'),
  ('Factory 4','TRK-F4-4006','FedEx Freight',     'San Antonio, TX','Waltham, MA',     'Raytheon',        'ORD-F4-006',  300,   570.00,'IN_TRANSIT',     '2026-05-19',NULL,'',''),
  ('Factory 4','TRK-F4-4007','UPS Supply Chain',  'San Antonio, TX','Charlotte, NC',   'Honeywell',       'ORD-F4-007',  100,  7400.00,'DELIVERED',      '2026-05-09','2026-05-09','',''),
  ('Factory 4','TRK-F4-4008','DHL Industrial',    'San Antonio, TX','St. Paul, MN',    '3M Industrial',   'ORD-F4-008',10000,   420.00,'PREPARING',      '2026-06-01',NULL,'',''),
  ('Factory 4','TRK-F4-4009','XPO Logistics',     'San Antonio, TX','Seattle, WA',     'Boeing',          'ORD-F4-009',  200,   580.00,'OUT_FOR_DELIVERY','2026-05-17',NULL,'',''),
  ('Factory 4','TRK-F4-4010','J.B. Hunt',         'San Antonio, TX','Fort Worth, TX',  'Lockheed Martin', 'ORD-F4-012',  150,   900.00,'DELAYED',        '2026-05-04',NULL,'Stress test failure; re-inspecting batch',''),

  -- ─── Warehouse 1 — Memphis, TN (bulk outbound) ──────────────────────
  ('Warehouse 1','TRK-W1-5001','FedEx Freight',     'Memphis, TN','Detroit, MI',     'Ford Motor Co',   'ORD-W1-001',  200, 17000.00,'DELIVERED',      '2026-05-09','2026-05-08','',''),
  ('Warehouse 1','TRK-W1-5002','UPS Supply Chain',  'Memphis, TN','Seattle, WA',     'Boeing',          'ORD-W1-002', 1500, 21300.00,'DELIVERED',      '2026-05-10','2026-05-10','',''),
  ('Warehouse 1','TRK-W1-5003','DHL Industrial',    'Memphis, TN','Fort Worth, TX',  'Lockheed Martin', 'ORD-W1-003', 5000,   110.00,'OUT_FOR_DELIVERY','2026-05-14',NULL,'',''),
  ('Warehouse 1','TRK-W1-5004','XPO Logistics',     'Memphis, TN','Peoria, IL',      'Caterpillar',     'ORD-W1-004',  500, 16000.00,'DELIVERED',      '2026-04-28','2026-04-27','',''),
  ('Warehouse 1','TRK-W1-5005','J.B. Hunt',         'Memphis, TN','Falls Church, VA','General Dynamics','ORD-W1-005',  100, 10000.00,'OUT_FOR_DELIVERY','2026-05-15',NULL,'',''),
  ('Warehouse 1','TRK-W1-5006','FedEx Freight',     'Memphis, TN','Waltham, MA',     'Raytheon',        'ORD-W1-006',  800,  1520.00,'DELIVERED',      '2026-05-08','2026-05-09','','1-day late'),
  ('Warehouse 1','TRK-W1-5007','UPS Supply Chain',  'Memphis, TN','Charlotte, NC',   'Honeywell',       'ORD-W1-007',  200, 14800.00,'PREPARING',      '2026-05-28',NULL,'',''),
  ('Warehouse 1','TRK-W1-5008','DHL Industrial',    'Memphis, TN','Seattle, WA',     'Boeing',          'ORD-W1-009',  500,  1425.00,'DELIVERED',      '2026-05-02','2026-05-02','',''),
  ('Warehouse 1','TRK-W1-5009','XPO Logistics',     'Memphis, TN','Detroit, MI',     'Ford Motor Co',   'ORD-W1-010', 2000,  4000.00,'IN_TRANSIT',     '2026-05-30',NULL,'',''),
  ('Warehouse 1','TRK-W1-5010','J.B. Hunt',         'Memphis, TN','Fort Worth, TX',  'Lockheed Martin', 'ORD-W1-012',  300,  1800.00,'DELAYED',        '2026-05-06',NULL,'Pallet recount in progress',''),

  -- ─── Warehouse 2 — Phoenix, AZ (smaller, mixed pace) ────────────────
  ('Warehouse 2','TRK-W2-6001','FedEx Freight',     'Phoenix, AZ','Detroit, MI',     'Ford Motor Co',   'ORD-W2-001',   60,  5100.00,'PREPARING',      '2026-05-26',NULL,'',''),
  ('Warehouse 2','TRK-W2-6002','UPS Supply Chain',  'Phoenix, AZ','Seattle, WA',     'Boeing',          'ORD-W2-002',  400,  5680.00,'IN_TRANSIT',     '2026-06-03',NULL,'',''),
  ('Warehouse 2','TRK-W2-6003','DHL Industrial',    'Phoenix, AZ','Fort Worth, TX',  'Lockheed Martin', 'ORD-W2-003',  600,    13.50,'OUT_FOR_DELIVERY','2026-05-16',NULL,'',''),
  ('Warehouse 2','TRK-W2-6004','XPO Logistics',     'Phoenix, AZ','Peoria, IL',      'Caterpillar',     'ORD-W2-004',  150,  4800.00,'DELIVERED',      '2026-05-10','2026-05-10','',''),
  ('Warehouse 2','TRK-W2-6005','J.B. Hunt',         'Phoenix, AZ','Falls Church, VA','General Dynamics','ORD-W2-005',   25,  2500.00,'DELIVERED',      '2026-04-20','2026-04-18','',''),
  ('Warehouse 2','TRK-W2-6006','FedEx Freight',     'Phoenix, AZ','Waltham, MA',     'Raytheon',        'ORD-W2-006',  100,   190.00,'DELAYED',        '2026-05-15',NULL,'Carrier capacity at hub',''),
  ('Warehouse 2','TRK-W2-6007','UPS Supply Chain',  'Phoenix, AZ','Charlotte, NC',   'Honeywell',       'ORD-W2-007',   40,  2960.00,'IN_TRANSIT',     '2026-05-24',NULL,'',''),
  ('Warehouse 2','TRK-W2-6008','DHL Industrial',    'Phoenix, AZ','St. Paul, MN',    '3M Industrial',   'ORD-W2-008', 7000,   294.00,'PREPARING',      '2026-06-18',NULL,'',''),
  ('Warehouse 2','TRK-W2-6009','XPO Logistics',     'Phoenix, AZ','Seattle, WA',     'Boeing',          'ORD-W2-009',   80,   232.00,'DELIVERED',      '2026-05-09','2026-05-09','',''),
  ('Warehouse 2','TRK-W2-6010','J.B. Hunt',         'Phoenix, AZ','Detroit, MI',     'Ford Motor Co',   'ORD-W2-010',  300,  2850.00,'DELAYED',        '2026-05-07',NULL,'Mis-pick on aisle 12 — re-stage','')

on conflict (instance_name, tracking_number) do update set
  carrier           = excluded.carrier,
  origin            = excluded.origin,
  destination       = excluded.destination,
  customer          = excluded.customer,
  order_ref         = excluded.order_ref,
  items_count       = excluded.items_count,
  weight_kg         = excluded.weight_kg,
  status            = excluded.status,
  estimated_arrival = excluded.estimated_arrival,
  actual_arrival    = excluded.actual_arrival,
  delay_reason      = excluded.delay_reason,
  notes             = excluded.notes,
  updated_at        = now();
