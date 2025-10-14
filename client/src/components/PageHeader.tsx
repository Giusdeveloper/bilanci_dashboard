interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div 
      className="p-8 rounded-xl mb-8" 
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary)) 0%, #8b5cf6 100%)",
        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
      }}
      data-testid="page-header"
    >
      <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-page-title">
        {title}
      </h1>
      {subtitle && (
        <p className="text-white/95" data-testid="text-page-subtitle">
          {subtitle}
        </p>
      )}
    </div>
  );
}
