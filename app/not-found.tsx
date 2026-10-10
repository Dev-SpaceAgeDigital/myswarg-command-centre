export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-canvas px-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark.png" alt="MySwarg" className="w-20 h-20 object-contain mb-6 animate-float" />
      <p className="font-display text-[96px] leading-none font-semibold tracking-tighter bg-gradient-to-b from-blue-600 to-blue-300 bg-clip-text text-transparent mb-4">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">Oops, this room doesn&apos;t exist 🙈</h1>
      <p className="text-gray-500 mb-8">The page you are looking for does not exist.</p>
      <a
        href="/dashboard"
        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700"
      >
        Take me home 🏡
      </a>
    </div>
  );
}
