import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { ACCOUNT_REMOVAL, POLICY_EFFECTIVE_DATE } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Delete your MySwarg account or society | MySwarg',
  description: 'How to remove your account or society data from MySwarg.',
};

export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Account and data removal"
      updated={POLICY_EFFECTIVE_DATE}
      intro="MySwarg accounts are created by your Wing Secretary, so removal is handled through your society. Here is how to request it."
      sections={ACCOUNT_REMOVAL}
    />
  );
}
