export const PageLoader = () => (
  <div className="min-h-96 flex flex-col items-center justify-center gap-4">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/brand/mark.png" alt="" aria-hidden className="w-12 h-12 object-contain animate-float" />
    <p className="text-sm font-medium text-gray-400">Just a moment…</p>
  </div>
);
