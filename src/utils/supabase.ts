import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ynsvnfggfoiryjlshtlr.supabase.co/rest/v1/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc3ZuZmdnZm9pcnlqbHNodGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzM5NzIsImV4cCI6MjEwNjYwOTk3Mn0.ulw9ho_3BtatlUjyLsJyzdBKxkCX6gZjWmId0jdZCiI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);