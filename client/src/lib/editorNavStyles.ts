/** Shared active/inactive styles for editor navigation (shell tabs + sidebar). */

export const EDITOR_NAV_ACTIVE_CLASS =
  'bg-imm-yellow text-imm-blue-dark font-bold shadow-sm border border-imm-yellow-dark hover:bg-imm-yellow-dark no-default-hover-elevate';

export const EDITOR_NAV_INACTIVE_CLASS =
  'border [border-color:var(--button-outline)] text-imm-blue-dark/70 hover:bg-imm-neutral-mid/60 hover:text-imm-blue-dark';

export const EDITOR_SIDEBAR_ACTIVE_CLASS =
  'data-[active=true]:bg-imm-yellow data-[active=true]:text-imm-blue-dark data-[active=true]:font-bold data-[active=true]:hover:bg-imm-yellow-dark data-[active=true]:hover:text-imm-blue-dark';

export function isEditorNavActive(location: string, href: string): boolean {
  return location === href;
}
