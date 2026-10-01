export interface Branch {
  id: number;
  name: string;
  address: string | null;
  contact_number: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PublicBranch {
  id: number;
  name: string;
}

export interface Item {
  id: number;
  name: string;
  unit: string;
  price: number;
  divisor: number;
  is_active: boolean;
}

export interface InventoryRecord {
  id: number;
  branch_id: number;
  item_id: number;
  user_id: number | null;
  crew_name: string | null;
  status: 'pending' | 'checked';
  checked_by: string | null;
  checked_at: string | null;
  shift_number: 1 | 2 | 3;
  record_date: string;
  beginning_qty: number;
  beginning_qty_auto: number | null;          // NEW: system-calculated value, for comparison
  beginning_override_reason: string | null;    // NEW: crew's reason when they corrected it
  del_qty: number;
  out_qty: number;
  ending_qty: number;
  usage_qty: number;
  total_order: number;
  total_sales: number;
  notes: string | null;
  item?: Item;
  branch?: Branch;
}

export interface ShiftPreviewItem {
  item_id: number;
  item_name: string;
  unit: string;
  price: number;
  divisor: number;
  beginning_qty: number;
  existing_record: InventoryRecord | null;
}

export interface ShiftPreviewResponse {
  branch_id: number;
  shift_number: number;
  record_date: string;
  items: ShiftPreviewItem[];
}

export interface BulkSubmitItemRow {
  item_id: number;
  del_qty: number;
  out_qty: number;
  ending_qty: number;
  beginning_qty?: number;
  beginning_override_reason?: string | null;   // NEW: required by backend if beginning_qty differs from auto
}

export interface BulkSubmitPayload {
  shift_number: 1 | 2 | 3;
  record_date: string;
  crew_name: string;
  items: BulkSubmitItemRow[];
}

export type UserRole = 'crew' | 'head_crew' | 'admin' | 'manager';


export interface CashCount {
  id: number;
  branch_id: number;
  shift_number: number;
  record_date: string;

  pieces_1000: number;
  pieces_500: number;
  pieces_100: number;
  pieces_50: number;
  pieces_20: number;
  pieces_10: number;
  pieces_5: number;
  pieces_1: number;

  serials_1000: string[];
  serials_500: string[];

  total_cash: number;
  total_expenses: number;
  net_cash: number;

  crew_name: string | null;
  notes: string | null;

  finalized_at: string | null;
  finalized_by: string | null;

  // Head Crew review
  reviewed_expenses: number | null;
  expected_cash: number | null;
  cash_variance: number | null;
  variance_status: 'SHORT' | 'EXACT' | 'OVER' | null;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface CashCountReviewResponse {
  submitted: boolean;

  inventory_checked: boolean;
  inventory_count: number;
  checked_inventory_count: number;

  total_sales: number;

  cash_count: CashCount;

  reviewed_expenses: number;

  expected_cash: number;
  actual_cash: number;

  cash_variance: number;

  variance_status: 'SHORT' | 'EXACT' | 'OVER';
}

export interface CashCountReviewPayload {
  shift_number: 1 | 2 | 3;
  record_date: string;

  reviewed_by: string;

  reviewed_expenses: number;

  review_notes?: string;
}

export interface CashCountPayload {
  shift_number: 1 | 2 | 3;
  record_date: string;
  crew_name?: string;
  pieces_1000: number;
  pieces_500: number;
  pieces_100: number;
  pieces_50: number;
  pieces_20: number;
  pieces_10: number;
  pieces_5: number;
  pieces_1: number;
  serials_1000: string[];
  serials_500: string[];
  total_expenses: number;
  notes: string;
}
export interface CheckShiftResponse {
  branch_id: number;
  shift_number: number;
  record_date: string;
  checked_count: number;
  records: InventoryRecord[];
  shift_total_sales: number;
}

export interface BulkSubmitResponse {
  branch_id: number;
  shift_number: number;
  record_date: string;
  crew_name: string;
  records: InventoryRecord[];
  shift_total_sales: number;
}