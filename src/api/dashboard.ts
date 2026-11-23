import { one, supabase } from '@/lib/supabase'
import type { DashboardResumen } from '@/types/db'

export const fetchDashboard = async () =>
  one<DashboardResumen>(await supabase.from('vista_dashboard_bg').select('*').maybeSingle())
