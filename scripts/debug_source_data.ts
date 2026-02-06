
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../client/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSourceData() {
    console.log("=== CHECKING SOURCE DATA IN SUPABASE ===\n");

    // 1. List Companies
    const { data: companies } = await supabase.from('companies').select('*');
    if (!companies) {
        console.log("No companies found.");
        return;
    }

    for (const company of companies) {
        console.log(`Checking Company: ${company.name} (${company.id})`);

        const { data: sourceData, error } = await supabase
            .from('financial_data')
            .select('id, year, month, created_at, data')
            .eq('company_id', company.id)
            .eq('data_type', 'source')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Query Error:", error.message);
            continue;
        }

        if (sourceData && sourceData.length > 0) {
            console.log(`✅ Found ${sourceData.length} records.`);
            const latest = sourceData[0];
            console.log(`   Latest Record: Year=${latest.year}, Month=${latest.month}, Created=${latest.created_at}`);

            const content = latest.data;
            if (Array.isArray(content)) {
                console.log(`   Data Type: Array, Length=${content.length}`);
                if (content.length > 0) {
                    console.log(`   Row 0 (Header/First):`, JSON.stringify(content[0]).substring(0, 100) + "...");
                }
            } else {
                console.log(`   Data Type: Object/Other`, typeof content);
            }
        } else {
            console.log("❌ No source data found.");
        }
        console.log("-".repeat(40));
    }
}

checkSourceData();
