export type Role = 'admin' | 'staff'
export interface UserProfile {
  id: string
  full_name: string
  role: Role
  email?: string
}
export interface Employee {
  id: string
  employee_number: string
  first_name: string
  middle_name: string
  last_name: string
  suffix: string
  position: string
  department: string
  email: string
  active: boolean
  created_at?: string
  updated_at?: string
}
export interface EventCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  active: boolean
}
export interface EmployeeLeave {
  employee_id: string
  leave_type: string
  leave_status: 'approved' | 'pending' | 'cancelled'
  notes: string
}
export interface Holiday {
  holiday_type: string
}
export interface CalendarEvent {
  id: string
  title: string
  description: string
  category_id: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  all_day: boolean
  location: string
  employee_id: string | null
  created_by: string | null
  status: 'confirmed' | 'pending' | 'cancelled'
  visibility: 'office' | 'admin'
  created_at?: string
  updated_at?: string
  employee_leave_details?: EmployeeLeave | null
  holiday_details?: Holiday | null
  creator?: { full_name: string } | null
}
export interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  description: string
  created_at: string
}
export interface AppData {
  employees: Employee[]
  categories: EventCategory[]
  events: CalendarEvent[]
  logs: ActivityLog[]
}
