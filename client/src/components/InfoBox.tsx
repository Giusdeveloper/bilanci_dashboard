import { Info } from "lucide-react";

interface InfoBoxProps {
  title: string;
  children: React.ReactNode;
}

export default function InfoBox({ title, children }: InfoBoxProps) {
  return (
    <div 
      className="p-5 rounded-xl border-2"
      style={{
        backgroundColor: "#eff6ff",
        borderColor: "#bfdbfe"
      }}
      data-testid="info-box"
    >
      <div className="font-bold flex items-center gap-2 mb-2" style={{ color: "#1e40af" }} data-testid="text-info-title">
        <Info className="w-5 h-5" />
        {title}
      </div>
      <div className="text-sm" style={{ color: "#1e40af" }} data-testid="text-info-content">
        {children}
      </div>
    </div>
  );
}
