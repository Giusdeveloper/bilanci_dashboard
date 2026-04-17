import { useFinancialData } from "@/contexts/FinancialDataContext";
import awentiaLogo from "@assets/awentia-logo-standard_1760537986689.png";
import sherpa42Logo from "@assets/logo_sherpa42.png";
import maiaLogo from "../../../attached_assets/logo_maia.png";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

// Mapping tra nome/slug azienda e logo
const getCompanyLogo = (companyName?: string | null, companySlug?: string | null) => {
  const name = (companyName || companySlug || "").toLowerCase();
  
  if (name.includes("awentia")) {
    return awentiaLogo;
  }
  
  if (name.includes("sherpa42") || name.includes("sherpa")) {
    return sherpa42Logo;
  }

  if (name.includes("maia")) {
    return maiaLogo;
  }
  
  // Se non c'è match, restituisci null per non mostrare loghi errati
  return null;
};

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { selectedCompany } = useFinancialData();
  const companyLogo = getCompanyLogo(selectedCompany?.name, selectedCompany?.slug);
  const companyName = selectedCompany?.name || "Dashboard";

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
        {companyLogo && (
          <div className="flex-shrink-0">
            <img 
              src={companyLogo} 
              alt={`${companyName} Logo`}
              className="h-16 w-auto brightness-0 invert"
              data-testid="img-page-header-logo"
            />
          </div>
        )}
      </div>
    </div>
  );
}
