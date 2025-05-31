export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <h1 className="text-5xl font-bold mb-4 text-blue-700">Manage Port</h1>
      <p className="text-xl mb-6 max-w-2xl text-center text-gray-700">
        Manage Port is a modern real estate management platform. Effortlessly track your property portfolio, monitor key metrics, manage leases, utilities, and more—all in one secure, easy-to-use dashboard.
      </p>
      <ul className="mb-8 text-lg text-gray-600 list-disc list-inside">
        <li>Dashboard with portfolio overview and key metrics</li>
        <li>Properties page with full CRUD operations</li>
        <li>Utility management linked to each property</li>
        <li>Lease management with future document upload support</li>
        <li>Secure authentication powered by Clerk</li>
        <li>Real-time data with Convex</li>
      </ul>
      <a href="/sign-in" className="px-6 py-3 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition">Get Started</a>
    </div>
  );
} 