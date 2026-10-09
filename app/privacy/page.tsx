import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { PRIVACY_POLICY, POLICY_EFFECTIVE_DATE } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy | MySwarg',
  description: 'How MySwarg collects, uses and protects information.',
};

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated={POLICY_EFFECTIVE_DATE} sections={PRIVACY_POLICY} />;
}
