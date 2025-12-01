/**
 * ServiceOS Type Definitions
 *
 * Shared TypeScript types for ServiceOS features
 */

// Re-export types from individual modules for convenience
export type {
  Job,
  JobStatusHistoryEntry,
  CreateJobInput,
  UpdateJobInput,
} from "./job-tracking";

export type {
  Payment,
  PaymentRequest,
  ATHMovilConfig,
} from "./ath-movil";

export type {
  CommunicationMessage,
  SendMessageInput,
  TwilioConfig,
} from "./communications";

// Technician types
export interface Technician {
  id: string;
  tenant_id: number;
  employee_number: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  status: "active" | "inactive" | "on_break" | "off_duty";
  specializations: string[] | null;
  certifications: TechnicianCertification[] | null;
  service_regions: string[] | null;
  hourly_rate: number | null;
  current_location_lat: number | null;
  current_location_lng: number | null;
  last_location_update: string | null;
  avatar_url: string | null;
  bio: string | null;
  languages: string[];
  vehicle_info: VehicleInfo | null;
  created_at: string;
  updated_at: string;
}

export interface TechnicianCertification {
  name: string;
  number: string;
  expires: string;
  issuer?: string;
}

export interface VehicleInfo {
  make: string;
  model: string;
  plate: string;
  year: number;
  color?: string;
}

export interface TechnicianAvailability {
  id: number;
  technician_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  is_available: boolean;
  created_at: string;
}

export interface TechnicianTimeOff {
  id: number;
  technician_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  type: "time_off" | "sick" | "vacation" | "break";
  approved: boolean;
  created_at: string;
}

// Dispatch types
export interface DispatchBoard {
  date: string;
  jobs: Job[];
  technicians: Technician[];
  stats: JobStats;
}

export interface JobStats {
  total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total_revenue: number;
  pending_payment: number;
}

export interface PaymentStats {
  total_payments: number;
  total_revenue: number;
  pending_amount: number;
  refunded_amount: number;
  ath_movil_revenue: number;
  cash_revenue: number;
  card_revenue: number;
}

// Route optimization types
export interface RouteStop {
  job_id: string;
  address: string;
  lat: number;
  lng: number;
  scheduled_time: string;
  estimated_duration: number;
  priority: string;
}

export interface OptimizedRoute {
  technician_id: string;
  stops: RouteStop[];
  total_distance: number;
  total_duration: number;
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
}

// ServiceOS configuration
export interface ServiceOSConfig {
  // Payment settings
  ath_movil: {
    enabled: boolean;
    merchant_id?: string;
    environment: "sandbox" | "production";
  };
  cash_enabled: boolean;
  card_enabled: boolean;

  // Communication settings
  sms: {
    enabled: boolean;
    provider: "twilio";
  };
  whatsapp: {
    enabled: boolean;
    provider: "twilio";
  };
  email: {
    enabled: boolean;
    provider: "cloudflare" | "sendgrid" | "ses";
  };

  // Dispatch settings
  auto_assign: boolean;
  route_optimization: boolean;
  real_time_tracking: boolean;

  // Regional settings
  default_language: "en" | "es";
  timezone: string;
  currency: string;
}

// Customer portal types
export interface CustomerJobView {
  job_code: string;
  customer_name: string;
  customer_address: string;
  customer_city: string;
  service_type: string;
  service_description: string | null;
  priority: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  total_amount: number;
  payment_status: string;
  notes: string | null;
  photos_urls: string[] | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Analytics types
export interface ServiceMetrics {
  period: string;
  jobs_completed: number;
  revenue_generated: number;
  average_job_duration: number;
  customer_satisfaction: number;
  technician_utilization: number;
  on_time_percentage: number;
}

export interface TechnicianPerformance {
  technician_id: string;
  jobs_completed: number;
  revenue_generated: number;
  average_rating: number;
  on_time_percentage: number;
  hours_worked: number;
}
