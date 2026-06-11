import { describe, expect, it } from 'vitest';
import {
  emailRuleMatches,
  extractPlusTag,
  resolveEmailIngestRule,
  type EmailIngestRule,
} from './emailIngestRules';

const awentiaSubject: EmailIngestRule = {
  id: '1',
  company_id: 'c1',
  match_type: 'subject_regex',
  match_value: '(?i)awentia',
  file_type: 'bilancino',
  auto_publish: false,
  priority: 10,
};

const maiaPlus: EmailIngestRule = {
  id: '2',
  company_id: 'c2',
  match_type: 'plus_address',
  match_value: 'maia',
  file_type: 'bilancino',
  auto_publish: false,
  priority: 20,
};

describe('emailIngestRules', () => {
  it('extractPlusTag from plus addressing', () => {
    expect(extractPlusTag('bilanci+awentia@imment.it')).toBe('awentia');
    expect(extractPlusTag('other@imment.it')).toBeNull();
  });

  it('matches subject regex', () => {
    expect(
      emailRuleMatches(awentiaSubject, {
        from: 'studio@contabilita.it',
        subject: 'Bilancino Awentia marzo 2026',
        to: 'bilanci@imment.it',
      }),
    ).toBe(true);
  });

  it('matches plus address with lower priority than subject', () => {
    const rules = [maiaPlus, awentiaSubject];
    const bySubject = resolveEmailIngestRule(rules, {
      from: 'x@y.it',
      subject: 'Awentia',
      to: 'bilanci+maia@imment.it',
    });
    expect(bySubject?.id).toBe('1');

    const byPlus = resolveEmailIngestRule(rules, {
      from: 'x@y.it',
      subject: 'Generico',
      to: 'bilanci+maia@imment.it',
    });
    expect(byPlus?.id).toBe('2');
  });
});
