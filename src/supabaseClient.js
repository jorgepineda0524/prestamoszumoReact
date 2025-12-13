import { createClient } from '@supabase/supabase-js'

// REEMPLAZA estos valores con los tuyos de Supabase
const supabaseUrl = 'https://xwjtravipukrzggoxbzo.supabase.co'
const supabaseAnonKey = 'sb_publishable_Oak8lJgtdmLJerGAPZYBwA_wPyylOf4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)