
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI';

async function promoteToAdmin() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const email = 'pistoia702@gmail.com';
    
    console.log(`🚀 Promuovo ${email} ad ADMIN...`);
    
    const { data, error } = await supabase
        .from('bilanci_users')
        .update({ role: 'admin', company_id: null })
        .eq('email', email)
        .select();
        
    if (error) {
        console.error("❌ Errore promozione:", error);
    } else {
        console.log("✅ Ora sei ADMIN:", data);
    }
}

promoteToAdmin();
