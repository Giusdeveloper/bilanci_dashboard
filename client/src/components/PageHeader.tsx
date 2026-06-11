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
      className="p-10 rounded-xl mb-8 page-header-gradient relative overflow-hidden" 
      data-testid="page-header"
    >
      {/* Background Watermark (Imment Pictogram) */}
      <div className="absolute right-[-20px] bottom-[-40px] opacity-10 pointer-events-none">
        <svg id="Livello_2" data-name="Livello 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224.89 198.43" className="w-64 h-auto">
          <g id="Livello_1-2" data-name="Livello 1">
            <path style={{fill: '#f3f6f9'}} d="M145.98,41.02h-45.46c-4.61,0-8.53-2.92-10.02-7.02l-8.97-26.62c-1.38-4.29-5.4-7.39-10.14-7.39-.35,0-.69.02-1.03.05C30.8,4.31,0,37.81,0,78.5c0,43.58,35.33,78.91,78.91,78.91h45.49c4.69,0,8.67,3.03,10.1,7.23l8.99,26.69c1.47,4.13,5.41,7.09,10.05,7.09.41,0,.81-.02,1.21-.07,39.46-4.36,70.15-37.81,70.15-78.43,0-43.58-35.33-78.91-78.91-78.91ZM145.98,157.41h-6.27c-4.6,0-8.52-2.91-10.01-6.99l-4.29-12.73c-4.17-12.61-16.06-21.71-30.07-21.71h-16.44c-20.7,0-37.48-16.78-37.48-37.48s16.78-37.48,37.48-37.48h6.3c4.73,0,8.73,3.08,10.13,7.34l4.23,12.55c4.32,12.54,16.22,21.54,30.22,21.54h0s16.2,0,16.2,0c20.7,0,37.48,16.78,37.48,37.48s-16.78,37.48-37.48,37.48Z"/>
          </g>
        </svg>
      </div>

      <div className="flex items-center justify-between gap-6 relative z-10">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white mb-2 font-heading tracking-tight" data-testid="text-page-title">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/80 font-medium text-lg font-sans" data-testid="text-page-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        {companyLogo && (
          <div className="flex-shrink-0 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
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
