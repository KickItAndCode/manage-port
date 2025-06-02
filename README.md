# ManagePort

A modern property management platform for landlords and property managers to efficiently manage their rental properties, leases, utilities, and documents.

## Features

- **Property Management**: Track multiple properties with detailed information, photos, and financial metrics
- **Lease Management**: Manage tenant leases, track payment schedules, and monitor lease expirations
- **Utility Tracking**: Monitor utility costs and billing cycles across properties
- **Document Storage**: Securely store and organize property-related documents with easy access
- **Dashboard Analytics**: Visualize portfolio performance with charts and key metrics
- **Global Search**: Quickly find properties, leases, and documents across your portfolio
- **Mobile Responsive**: Fully responsive design that works seamlessly on all devices
- **Dark Mode**: Built-in dark mode support for comfortable viewing

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Convex (real-time backend platform)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS, Radix UI components
- **File Storage**: Convex file storage
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Create a `.env.local` file
   - Add your Clerk and Convex API keys

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the application

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # Reusable React components
├── lib/              # Utility functions and helpers
convex/              # Backend API functions and schema
```

## License

This project is licensed under the MIT License.
