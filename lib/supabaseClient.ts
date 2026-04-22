import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eqvrdgpuvohqysccomuy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdnJkZ3B1dm9ocXlzY2NvbXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjQzMjIsImV4cCI6MjA5MjIwMDMyMn0.E8amHhPKyPJjaBS5rDidRR-WtX5K2JVbyxs4L8IedSo'

export const supabase = createClient(supabaseUrl, supabaseKey)
