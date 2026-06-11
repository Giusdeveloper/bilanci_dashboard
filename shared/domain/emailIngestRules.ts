/** Regole routing email → azienda (Sprint B PoC). */

export interface EmailIngestRule {
  id: string;
  company_id: string;
  match_type: 'sender_domain' | 'subject_regex' | 'plus_address' | 'sender_email';
  match_value: string;
  file_type: string;
  auto_publish: boolean;
  priority: number;
}

export interface EmailEnvelope {
  from: string;
  subject: string;
  to: string;
}

export function extractPlusTag(emailTo: string): string | null {
  const match = emailTo.match(/bilanci\+([^@]+)@/i);
  return match ? match[1].toLowerCase() : null;
}

export function emailRuleMatches(rule: EmailIngestRule, ctx: EmailEnvelope): boolean {
  const from = ctx.from.toLowerCase();
  const subject = ctx.subject;
  const to = ctx.to.toLowerCase();

  switch (rule.match_type) {
    case 'sender_email':
      return from === rule.match_value.toLowerCase();
    case 'sender_domain': {
      const domain = from.split('@')[1] ?? '';
      return domain === rule.match_value.toLowerCase();
    }
    case 'subject_regex': {
      let pattern = rule.match_value;
      if (pattern.startsWith('(?i)')) pattern = pattern.slice(4);
      try {
        return new RegExp(pattern, 'i').test(subject);
      } catch {
        return subject.toLowerCase().includes(pattern.toLowerCase());
      }
    }
    case 'plus_address': {
      const tag = extractPlusTag(to);
      return tag === rule.match_value.toLowerCase();
    }
    default:
      return false;
  }
}

export function resolveEmailIngestRule(
  rules: EmailIngestRule[],
  ctx: EmailEnvelope,
): EmailIngestRule | null {
  const sorted = [...rules].filter((r) => r).sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (emailRuleMatches(rule, ctx)) return rule;
  }
  return null;
}
