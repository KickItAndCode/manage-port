import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 transition-colors duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-10 flex flex-col items-center w-full max-w-2xl">
        <h1 className="text-5xl font-bold mb-4 text-primary">Manage Port</h1>
        <p className="text-xl mb-6 max-w-2xl text-center text-muted-foreground">
          Manage Port is a modern real estate management platform. Effortlessly track your property portfolio, monitor key metrics, manage leases, utilities, and more—all in one secure, easy-to-use dashboard.
        </p>
        <ul className="mb-8 text-lg text-muted-foreground list-disc list-inside">
          <li>Dashboard with portfolio overview and key metrics</li>
          <li>Properties page with full CRUD operations</li>
          <li>Utility management linked to each property</li>
          <li>Lease management with future document upload support</li>
          <li>Secure authentication powered by Clerk</li>
          <li>Real-time data with Convex</li>
        </ul>
        <Link href="/sign-in" className="px-6 py-3 bg-primary text-primary-foreground rounded shadow hover:bg-primary/90 transition-colors duration-200">Get Started</Link>
      </div>
    </div>
  );
} 