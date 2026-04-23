import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jaxnqttycxeavwhcsoyv.supabase.co'
const supabaseAnonKey = 'sb_publishable_NB1QD-neSnB3uknLBSDkcQ_wY3nI9Uu'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
