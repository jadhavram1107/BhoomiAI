export type Language = 'en' | 'mr' | 'hi';

export interface User {
  id: string;
  bhoomi_id?: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OFFICER' | 'REVIEWER' | 'USER' | 'TAHSILDAR' | 'DISTRICT_MAGISTRATE';
  designation?: string;
  department?: string;
  employee_id?: string;
  jurisdiction?: string;
  requested_role?: string;
  mobile_no?: string;
  account_status?: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED';
  created_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface OfficialAccountRequest {
  designation: string;
  full_name: string;
  department: string;
  employee_id: string;
  jurisdiction: string;
  requested_role: string;
  email: string;
  mobile_no: string;
  password: string;
  otp_code: string;
}

export interface ExtractedField {
  id: string;
  field_name: string;
  label_en: string;
  label_mr: string;
  label_hi: string;
  value: string;
  confidence: number;
  confidence_tier: 'high' | 'medium' | 'low';
  is_missing: boolean;
  is_edited: boolean;
  original_value?: string;
  bounding_box?: [number, number, number, number];
}

export interface ValidationCheck {
  id: string;
  check_name: string;
  severity: 'passed' | 'warning' | 'critical';
  message: string;
  field_name?: string;
  similarity_score?: number;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  status: 'uploaded' | 'processing' | 'completed' | 'pending_verification' | 'verified' | 'rejected';
  processing_stage: string;
  ocr_confidence: number;
  language: Language;
  fields?: ExtractedField[];
  validations?: ValidationCheck[];
}

export interface VerificationTask {
  id: string;
  document_id: string;
  filename: string;
  village: string;
  survey_number: string;
  issue_summary: string;
  confidence: number;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
  created_at: string;
  reviewed_by?: string;
  reviewer_comment?: string;
}

export interface GISParcel {
  id: string;
  survey_number: string;
  khasra_number: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  owner_name: string;
  cnic_id: string;
  khata_number: string;
  area: number;
  area_unit: string;
  land_type: string;
  land_use: string;
  verification_status: 'Verified' | 'Needs Review' | 'Pending';
  center_lat: number;
  center_lng: number;
  polygon_coordinates: [number, number][];
}

export interface ValidatedLandDocument {
  document_id: string;
  filename: string;
  digitization_status: '100% Digitized';
  validation_status: '100% Validated';
  location_certainty: number;
  owner_name: string;
  survey_number: string;
  khata_number: string;
  village: string;
  taluka: string;
  district: string;
  area: number;
  area_unit: string;
  land_type?: string;
  verified_at: string;
  parcel: GISParcel;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user_email: string;
  action: string;
  document_id?: string;
  field_name?: string;
  previous_value?: string;
  new_value?: string;
  details?: string;
}

export interface GovernmentSourceInfo {
  configured: boolean;
  purpose: string;
  requires?: string[];
  base_url?: string;
}

export type GovernmentSourceStatus = Record<string, GovernmentSourceInfo>;
