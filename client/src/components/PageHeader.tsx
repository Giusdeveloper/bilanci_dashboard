import { useFinancialData } from "@/contexts/FinancialDataContext";
import awentiaLogo from "@assets/awentia-logo-standard_1760537986689.png";
import sherpa42Logo from "@assets/logo_sherpa42.png";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

// Mapping tra nome/slug azienda e logo
const getCompanyLogo = (companyName?: string | null, companySlug?: string | null) => {
  if (!companyName && !companySlug) {
    return awentiaLogo; // Logo di default
  }

  const name = (companyName || companySlug || "").toLowerCase();
  
  // Mapping basato sul nome o slug dell'azienda
  if (name.includes("awentia")) {
    return awentiaLogo;
  }
  
  if (name.includes("sherpa42") || name.includes("sherpa")) {
    return sherpa42Logo;
  }
  
  // Se non c'è match, usa il logo di default (Awentia)
  return awentiaLogo;
};

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { selectedCompany } = useFinancialData();
  const companyLogo = getCompanyLogo(selectedCompany?.name, selectedCompany?.slug);
  const companyName = selectedCompany?.name || "Awentia";

  return (
    <div 
      className="p-8 rounded-xl mb-8 page-header-gradient" 
      data-testid="page-header"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-page-title">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/95" data-testid="text-page-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <img 
            src={companyLogo} 
            alt={`${companyName} Logo`}
            className="h-16 w-auto brightness-0 invert"
            data-testid="img-page-header-logo"
          />
        </div>
      </div>
    </div>
  );
}
