export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'user'
  salary_iqd: number
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  user_email: string
  action: string
  details: string | null
  created_at: string
}
