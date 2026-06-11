/**
 * EditorAdminGate — accesso admin + company + EditorProvider condiviso.
 */

import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { EditorProvider } from '@/contexts/EditorContext';
import PageHeader from '@/components/PageHeader';

interface EditorAdminGateProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function EditorAdminGate({ children, title, subtitle }: EditorAdminGateProps) {
  const { isEditorStaff } = useAuth();
  const { selectedCompany } = useFinancialData();

  if (!isEditorStaff) {
    return (
      <div className="p-6">
        <PageHeader title={title} subtitle="Accesso riservato al personale operativo" />
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <PageHeader title={title} subtitle="Seleziona un'azienda" />
      </div>
    );
  }

  return <EditorProvider>{children}</EditorProvider>;
}
