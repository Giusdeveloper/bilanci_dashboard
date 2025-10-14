import DataTable from '../DataTable';

export default function DataTableExample() {
  const columns = [
    { key: 'voce', label: 'Voce', align: 'left' as const },
    { key: 'value2025', label: '2025 (Gen-Ago)', align: 'right' as const },
    { key: 'percentage', label: '% sui Ricavi', align: 'right' as const },
    { key: 'value2024', label: '2024 (Gen-Ago)', align: 'right' as const },
    { key: 'variance', label: 'Var %', align: 'right' as const, className: 'font-semibold' },
  ];

  const data = [
    {
      voce: 'Ricavi',
      value2025: '€ 56.600,36',
      percentage: '100,0%',
      value2024: '€ 8.733,00',
      variance: '+548,3%',
    },
    {
      voce: 'Costi Servizi',
      value2025: '€ 9.092,05',
      percentage: '16,1%',
      value2024: '€ 19.535,00',
      variance: '-53,5%',
    },
    {
      voce: 'Costi Personale',
      value2025: '€ 1.537,20',
      percentage: '2,7%',
      value2024: '€ 0,00',
      variance: '+100,0%',
    },
    {
      voce: 'EBITDA',
      value2025: '€ 45.971,11',
      percentage: '81,2%',
      value2024: '€ 9.293,00',
      variance: '+395,0%',
    },
  ];

  return (
    <DataTable 
      title="Riepilogo Economico" 
      columns={columns} 
      data={data}
      totalRows={[3]}
    />
  );
}
