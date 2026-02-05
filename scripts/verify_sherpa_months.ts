
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SHERPA_SLUG = 'sherpa42';

async function verifyMonths() {
    console.log("=== CHECKING SHERPA42 DATA IN DB ===\n");
    const { data: company } = await supabase.from('companies').select('*').eq('slug', SHERPA_SLUG).single();
    if (!company) { console.error("Company not found"); return; }

    console.log(`Company ID: ${company.id}`);

    const { data: records, error } = await supabase
        .from('financial_data')
        .select('data_type, year, month, created_at, id')
        .eq('company_id', company.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

    if (error) { console.error(error); return; }

    console.log("\nFound Records:");
    console.table(records);

    // Check content of the latest dashboard record
    const dashboardRec = records?.find(r => r.data_type === 'dashboard' && r.month === 12);
    if (dashboardRec) {
        console.log("\nChecking DATA content for Dashboard Dec 2025...");
        const { data: fullRec } = await supabase.from('financial_data').select('data').eq('id', dashboardRec.id).single();
        if (fullRec) {
            const d = fullRec.data;
            console.log(`KPIs present? ${!!d.kpis}`);
            console.log(`FULL DATA: ${JSON.stringify(d).substring(0, 500)}...`);
            console.log(`Summary Rows: ${d.summary ? d.summary.length : 'undefined'}`);
            console.log(`MonthlyTrend Ricavi Points: ${d.monthlyTrend?.ricavi?.length}`);
        }
    } else {
        console.log("\n❌ NO Dashboard record found for Month 12!");
    }
}

verifyMonths().catch(console.error);
