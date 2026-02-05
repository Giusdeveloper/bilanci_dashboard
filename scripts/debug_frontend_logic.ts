
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SHERPA_SLUG = 'sherpa42';

async function simulateFrontendFetch() {
    console.log("=== SIMULATING FRONTEND FETCH ===\n");
    const { data: company } = await supabase.from('companies').select('*').eq('slug', SHERPA_SLUG).single();
    if (!company) return;

    // Mimic FinancialDataContext.tsx getDashboardData
    const { data, error } = await supabase
        .from('financial_data')
        .select('*')
        .eq('company_id', company.id)
        .eq('data_type', 'dashboard')
        .order('year', { ascending: false })
        .order('month', { ascending: false, nullsFirst: false })
        .limit(1);

    if (data && data.length > 0) {
        const dbData = data[0].data as any;
        console.log("Fetched Record Data Keys:", Object.keys(dbData));

        // Mimic dashboard.tsx logic
        let validSummary = dbData.summary || [];

        // CHECK: Is the fallback logic clearing it?
        if (dbData.kpis) {
            console.log("Branch 'dbData.kpis' taken.");
            // logic: const validSummary = dbData.summary || [];
            console.log("Summary length:", validSummary.length);
        } else if (dbData.trends || dbData.table) {
            // This branch is only taken if kpis is missing? no, if kpis is present, the first branch is taken.
            // Wait! The record HAS kpis. So it enters the first branch.
            // If dbData.summary is present, it uses it.
        }

    }
}

simulateFrontendFetch();
