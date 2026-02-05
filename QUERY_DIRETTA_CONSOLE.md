# Query Diretta per Console Browser

Esegui questo comando nella console del browser per vedere la struttura esatta dei dati:

```javascript
fetch('https://caubhppwypkymsixsrco.supabase.co/rest/v1/financial_data?company_id=eq.0fb5063a-4b54-4ab1-ae2b-afd04865a1a1&data_type=eq.dashboard&year=eq.2025&month=eq.9&select=*', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'
  }
})
.then(r => r.json())
.then(data => {
  console.log('📊 Dati completi:', data);
  if (data && data[0] && data[0].data) {
    const dbData = data[0].data;
    console.log('\n📊 TRENDS struttura:');
    console.log(JSON.stringify(dbData.trends, null, 2));
    console.log('\n📊 TABLE tipo:', Array.isArray(dbData.table) ? 'array' : typeof dbData.table);
    console.log('📊 TABLE lunghezza:', Array.isArray(dbData.table) ? dbData.table.length : 'N/A');
    if (Array.isArray(dbData.table) && dbData.table.length > 0) {
      console.log('📊 TABLE primo elemento:', dbData.table[0]);
    }
    console.log('\n📈 KPIs:', dbData.kpis);
  }
});
```

