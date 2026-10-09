// Single source of truth for the Privacy Policy and account-removal text.
// This file has no imports so the same file is copied into the Command Centre
// (lib/legal.ts) to power the public /privacy and /delete-account pages.
// If you edit one copy, copy the file to the other repo as well.

export const LEGAL_CONTACT_EMAIL = 'connect@spaceagedigital.com';
export const COMPANY_NAME = 'Space Age Group';
export const COMPANY_ADDRESS =
  'Space Age Group, Silver Coin Complex, 210, near Sony Centre, Vidyutnagar Colony, Tarangan Society, Akota, Vadodara, Gujarat 390007, India';
export const POLICY_EFFECTIVE_DATE = '9 October 2026';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: 'About MySwarg',
    paragraphs: [
      'MySwarg is a society management app for residential communities. It helps a Wing Secretary run maintenance billing, notices, complaints, visitor entry, amenity booking and a resident directory, and helps residents and security guards take part in these activities.',
      `MySwarg is provided by ${COMPANY_NAME}, ${COMPANY_ADDRESS} ("we", "us"). Contact: ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: 'Who creates your account',
    paragraphs: [
      'You do not sign up on your own. Your Wing Secretary (or our team, for a new society) adds your name and mobile number to the society directory. You can then log in using your mobile number and the login code your Secretary shares with you.',
    ],
  },
  {
    heading: 'Information we collect',
    paragraphs: [
      'Account details: your name, mobile number, role (resident, Secretary, guard), and the society, wing and flat you belong to. For residents this can include owner/tenant status, lease dates, family members living in the flat and their relation to you.',
      'Activity you create in the app: maintenance bills and payment records, UPI payment proof screenshots, complaints and their photos, notices, visitor entries (visitor name, phone number, purpose and a photo taken by the guard), guest invitations (guest name and phone number), amenity bookings, resale or rent listings and their photos, domestic help and vendor records, emergency alerts, and documents you upload to the Document Vault.',
      'Photos and files: the app asks for camera access to photograph visitors and complaints, and lets you pick photos or PDF files from your device. These are only collected when you choose to attach them.',
      'Voice input: the microphone button uses your phone\'s built-in speech recognition to turn speech into text. We do not record or store your voice.',
      'Security: when you log in, the app stores a secure login token on your device. If you enable fingerprint login, the check happens on your device; we never receive your fingerprint.',
      'We do not collect your location, contacts, call logs or SMS, and we do not show advertising.',
    ],
  },
  {
    heading: 'How we use it',
    paragraphs: [
      'To run the society features listed above, to show the right information to the right people (for example a resident sees their own bills; a guard sees visitor entries), to send in-app notifications about approvals and updates, to keep the service secure and prevent misuse, and to give you support.',
      'We do not sell your personal information.',
    ],
  },
  {
    heading: 'Who can see your information',
    paragraphs: [
      'Your information is shared only inside your society and wing, according to role: your Wing Secretary can see directory, billing, complaint and visitor information for the wing; security guards can see what they need to log and verify entries; other residents can see items meant for the community, such as notices and listings.',
      'Our team can access data to provide support, fix problems, or carry out a removal request.',
      'We use trusted service providers to run the app, for example cloud hosting and image/document storage. They process data only on our instructions. We may disclose information if required by law.',
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      'Data is sent over encrypted connections (HTTPS). Access is limited by login and role, and each society\'s data is kept separate from other societies. No system is perfectly secure, so please keep your login code private.',
    ],
  },
  {
    heading: 'How long we keep data',
    paragraphs: [
      'We keep your information while you are a member of a society that uses MySwarg. When you leave or your society is removed, personal details are deleted or anonymised within 30 days of the request. We may keep limited financial and billing records for as long as accounting or legal rules require, and security logs for a short period.',
    ],
  },
  {
    heading: 'Your choices and removal of data',
    paragraphs: [
      'Residents: if you are leaving the society, use "Leaving the society?" in the More tab to tell your Wing Secretary the date. After that date the Secretary removes your details from the directory.',
      'Security guards: when a guard changes, the Secretary deletes the old guard\'s details and adds the new guard.',
      `Secretaries and whole societies: email ${LEGAL_CONTACT_EMAIL} from the registered address to request removal of your society and its data. Our team verifies the request and completes it within 30 days.`,
      `You can also email ${LEGAL_CONTACT_EMAIL} to ask what data we hold about you, or to correct or delete it.`,
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'MySwarg is meant for adults. Family members, including children, are listed only by an adult resident of the flat, and we do not knowingly collect data directly from children.',
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      'We may update this policy from time to time. The latest version is always available in the app and at our website. Material changes will be announced in the app.',
    ],
  },
  {
    heading: 'Contact us',
    paragraphs: [`${COMPANY_NAME}\n${COMPANY_ADDRESS}\nEmail: ${LEGAL_CONTACT_EMAIL}`],
  },
];

export const ACCOUNT_REMOVAL: LegalSection[] = [
  {
    heading: 'Residents leaving a society',
    paragraphs: [
      'Open the More tab in the MySwarg app and tap "Leaving the society?". Choose the date you are leaving. Your Wing Secretary is notified and removes your details from the directory after that date.',
    ],
  },
  {
    heading: 'Security guards',
    paragraphs: [
      'Guards do not manage their own accounts. When a guard changes, the Wing Secretary deletes the previous guard\'s details and adds the new guard.',
    ],
  },
  {
    heading: 'Wing Secretaries and whole societies',
    paragraphs: [
      `To remove a society and all of its data, email ${LEGAL_CONTACT_EMAIL} from the Secretary's registered email address. Include the society name, your name and your registered mobile number. Our team will verify the request and complete the removal within 30 days.`,
    ],
  },
  {
    heading: 'What is deleted and what is kept',
    paragraphs: [
      'Deleted or anonymised: name, mobile number, flat and family details, photos, uploaded documents and complaints linked to the person or society.',
      'May be kept for a limited time where law or accounting requires: billing and payment records, and security logs.',
    ],
  },
];
