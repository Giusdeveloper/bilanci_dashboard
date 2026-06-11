/**
 * EditorPeriodLockBanner — avvisi lock periodo (Sprint 5.4).
 */

import { AlertTriangle } from 'lucide-react';
import type { PeriodLockWarning } from '@/data/draftEdits';

interface EditorPeriodLockBannerProps {
  warnings: PeriodLockWarning[];
}

export default function EditorPeriodLockBanner({ warnings }: EditorPeriodLockBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div
          key={`${w.code}-${i}`}
          className={`flex items-start gap-2 text-sm rounded-lg p-3 ${
            w.severity === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
}
