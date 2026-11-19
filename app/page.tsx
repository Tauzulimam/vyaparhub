export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          VyaparHub
        </h1>
        <p className="text-xl font-medium text-gray-700">
          Empowering Local Vendors
        </p>
        <p className="text-base text-gray-500">
          Hyperlocal marketplace connecting customers with nearby local stores.
        </p>
        <div className="pt-4">
          <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Phase 1 — Project Foundation Ready
          </span>
        </div>
      </div>
    </main>
  );
}
