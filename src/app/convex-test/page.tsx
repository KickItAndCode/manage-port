"use client";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useUser } from "@clerk/nextjs";

export default function ConvexTest() {
  const { user } = useUser();
  const addProperty = useMutation(api.properties.addProperty);
  const { isAuthenticated } = useConvexAuth();
  const propertiesResult = useQuery(api.properties.getProperties, isAuthenticated ? {} : "skip");
  const properties = propertiesResult?.properties ?? [];

  if (!user) return <div>Sign in to test Convex</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <button
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        onClick={() =>
          addProperty({
            name: "Test Property",
            address: "123 Main St",
            monthlyMortgage: 1000,
            type: "single-family",
            status: "occupied",
            bedrooms: 3,
            bathrooms: 2,
            squareFeet: 1500,
            purchaseDate: new Date().toISOString() })
        }
      >
        Add Property
      </button>
      <ul className="mt-4">
        {properties?.map((p) => (
          <li key={p._id} className="mb-2">
            <span className="font-bold">{p.name}</span> - {p.address} - ${p.monthlyMortgage || 'N/A'}
          </li>
        ))}
      </ul>
    </div>
  );
} 