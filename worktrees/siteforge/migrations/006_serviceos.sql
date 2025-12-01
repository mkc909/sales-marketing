-- Migration 006: ServiceOS Core Features
-- Adds job tracking, payments, dispatch, and communication tables for service businesses

-- Job tracking table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  job_code TEXT UNIQUE NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  customer_state TEXT NOT NULL,
  customer_zip TEXT NOT NULL,
  customer_lat REAL,
  customer_lng REAL,
  service_type TEXT NOT NULL,
  service_description TEXT,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'pending', -- pending, assigned, in_progress, completed, cancelled
  scheduled_date TEXT,
  scheduled_time_start TEXT,
  scheduled_time_end TEXT,
  estimated_duration_minutes INTEGER,
  technician_id TEXT,
  total_amount REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, pending, paid, refunded
  payment_method TEXT, -- ath_movil, cash, card
  notes TEXT,
  internal_notes TEXT,
  photos_urls JSON,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (technician_id) REFERENCES technicians(id)
);

-- Job status history
CREATE TABLE IF NOT EXISTS job_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  changed_by_type TEXT, -- system, technician, customer, admin
  notes TEXT,
  location_lat REAL,
  location_lng REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Technicians table
CREATE TABLE IF NOT EXISTS technicians (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  employee_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, inactive, on_break, off_duty
  specializations JSON, -- ["plumbing", "hvac", "electrical"]
  certifications JSON, -- [{name: "Master Plumber", number: "MP-12345", expires: "2026-01-01"}]
  service_regions JSON, -- ["San Juan", "Carolina", "Bayamón"]
  hourly_rate REAL,
  current_location_lat REAL,
  current_location_lng REAL,
  last_location_update TEXT,
  avatar_url TEXT,
  bio TEXT,
  languages JSON DEFAULT '["es"]', -- ["es", "en"]
  vehicle_info JSON, -- {make: "Ford", model: "Transit", plate: "ABC-123", year: 2020}
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Payments table (ATH Móvil and other methods)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  job_id TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT NOT NULL, -- ath_movil, cash, card, check
  payment_status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  ath_movil_reference TEXT,
  ath_movil_transaction_id TEXT,
  ath_movil_customer_phone TEXT,
  customer_name TEXT,
  customer_email TEXT,
  description TEXT,
  metadata JSON,
  webhook_data JSON,
  processed_at TEXT,
  refunded_at TEXT,
  refund_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Job communications (SMS, WhatsApp, Email)
CREATE TABLE IF NOT EXISTS job_communications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  communication_type TEXT NOT NULL, -- sms, whatsapp, email, internal_note
  direction TEXT NOT NULL, -- inbound, outbound
  recipient TEXT,
  sender TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, read
  external_id TEXT, -- Twilio SID, WhatsApp message ID, etc.
  metadata JSON,
  error_message TEXT,
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Technician availability/schedule
CREATE TABLE IF NOT EXISTS technician_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  technician_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  start_time TEXT NOT NULL, -- HH:MM format
  end_time TEXT NOT NULL,
  is_available INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (technician_id) REFERENCES technicians(id)
);

-- Time off/breaks
CREATE TABLE IF NOT EXISTS technician_time_off (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  technician_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  type TEXT DEFAULT 'time_off', -- time_off, sick, vacation, break
  approved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (technician_id) REFERENCES technicians(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_job_code ON jobs(job_code);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_technician_id ON jobs(technician_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_status_history_created_at ON job_status_history(created_at);

CREATE INDEX IF NOT EXISTS idx_technicians_tenant_id ON technicians(tenant_id);
CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);
CREATE INDEX IF NOT EXISTS idx_technicians_employee_number ON technicians(employee_number);

CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_ath_movil_reference ON payments(ath_movil_reference);

CREATE INDEX IF NOT EXISTS idx_job_communications_job_id ON job_communications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_communications_type ON job_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_job_communications_created_at ON job_communications(created_at);

CREATE INDEX IF NOT EXISTS idx_technician_availability_technician_id ON technician_availability(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_time_off_technician_id ON technician_time_off(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_time_off_dates ON technician_time_off(start_date, end_date);
