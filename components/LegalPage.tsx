import type { LegalSection } from '@/lib/legal';
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal';

// Simple public page shell for the Privacy Policy and account-removal pages.
// These pages must work without logging in (Google Play links to them).
export default function LegalPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro?: string;
  updated?: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <article className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">MySwarg</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">{title}</h1>
        {updated && <p className="mt-1 text-sm text-gray-500">Effective {updated}</p>}
        {intro && <p className="mt-4 text-gray-700">{intro}</p>}

        {sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">{section.heading}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="mt-2 whitespace-pre-line leading-relaxed text-gray-700">
                {p}
              </p>
            ))}
          </section>
        ))}

        <p className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-500">
          Questions? Email{' '}
          <a className="text-blue-600 underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </article>
    </main>
  );
}
