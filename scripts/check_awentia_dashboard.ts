
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAwentiaData() {
    console.log("=== AWENTIA DASHBOARD DATA CHECK ===\n");

    // 1. Find Awentia company
    const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', '%awentia%');

    if (companyError || !companies || companies.length === 0) {
        console.error("❌ Awentia not found in companies table");
        return;
    }

    const awentia = companies[0];
    console.log("✅ Found Awentia:", awentia.name, "(ID:", awentia.id, ")");

    // 2. Get dashboard data
    const { data: dashboardData, error: dataError } = await supabase
        .from('financial_data')
        .select('*')
        .eq('company_id', awentia.id)
        .eq('data_type', 'dashboard')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

    if (dataError) {
        console.error("❌ Error fetching dashboard data:", dataError);
        return;
    }

    console.log(`\n📊 Dashboard records found: ${dashboardData?.length || 0}\n`);

    if (dashboardData && dashboardData.length > 0) {
        dashboardData.forEach((record, idx) => {
            console.log(`--- Record ${idx + 1} ---`);
            console.log(`Year: ${record.year}, Month: ${record.month}`);
            console.log(`Data keys:`, Object.keys(record.data || {}));

            const data = record.data as any;
            if (data?.kpis) {
                console.log("KPIs found:");
                console.log("  ricavi2025:", data.kpis.ricavi2025);
                console.log("  ricavi2024:", data.kpis.ricavi2024);
                console.log("  ebitda2025:", data.kpis.ebitda2025);
                console.log("  ebitda2024:", data.kpis.ebitda2024);
                console.log("  margineEbitda2025:", data.kpis.margineEbitda2025);
                console.log("  margineEbitda2024:", data.kpis.margineEbitda2024);
            } else {
                console.log("⚠️ No 'kpis' key in data");
            }

            if (data?.monthlyTrend) {
                console.log("MonthlyTrend labels:", data.monthlyTrend.labels?.slice(0, 3), "...");
                console.log("MonthlyTrend ricavi count:", data.monthlyTrend.ricavi?.length);
            } else {
                console.log("⚠️ No 'monthlyTrend' key in data");
            }

            if (data?.summary) {
                console.log("Summary rows:", data.summary?.length);
            } else {
                console.log("⚠️ No 'summary' key in data");
            }

            console.log("");
        });
    } else {
        console.log("❌ No dashboard data found for Awentia!");
    }
}

checkAwentiaData();
