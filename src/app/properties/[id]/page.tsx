"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

export default function PropertyDetailsPage() {
  const params = useParams();
  const { user } = useUser();
  const propertyId = params?.id as string;

  const property = useQuery(
    api.properties.getProperty,
    user && propertyId ? { id: propertyId as any, userId: user.id } : "skip"
  );
  const utilities = useQuery(
    api.utilities.getUtilities,
    user && propertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
  );
  const leases = useQuery(
    api.leases.getLeases,
    user && propertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
  );
  const documents = useQuery(
    api.documents.getDocuments,
    user && propertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
  );

  if (!user) return <div className="text-center text-muted-foreground">Sign in to view property details.</div>;
  if (!property) return <div className="text-center text-muted-foreground">Loading property...</div>;
  if (property === null) return <div className="text-center text-muted-foreground">Property not found.</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl shadow-xl p-8">
        <Link href="/properties" className="text-muted-foreground hover:text-primary transition-colors mb-4 inline-block">&larr; Back to Properties</Link>
        <h1 className="text-3xl font-bold mb-2">{property.name}</h1>
        <div className="mb-4 text-muted-foreground">{property.type} &bull; {property.status}</div>
        {property.imageUrl && (
          <img src={property.imageUrl} alt="Property" className="w-full h-56 object-cover rounded-xl mb-6 border border-border" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div><span className="font-semibold">Address:</span> {property.address}</div>
          <div><span className="font-semibold">Bedrooms:</span> {property.bedrooms}</div>
          <div><span className="font-semibold">Bathrooms:</span> {property.bathrooms}</div>
          <div><span className="font-semibold">Square Feet:</span> {property.squareFeet}</div>
          <div><span className="font-semibold">Monthly Rent:</span> ${property.monthlyRent}</div>
          <div><span className="font-semibold">Purchase Date:</span> {property.purchaseDate}</div>
        </div>
        <hr className="my-6 border-border" />
        <h2 className="text-2xl font-bold mb-2">Documents</h2>
        <div className="mb-6">
          {documents === undefined ? (
            <div className="text-muted-foreground">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-muted-foreground">No documents for this property.</div>
          ) : (
            <ul className="list-disc pl-6">
              {documents.map((doc: any) => (
                <li key={doc._id}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    {doc.name}
                  </a>
                  {doc.type && <span className="ml-2 text-xs text-muted-foreground">({doc.type})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <h2 className="text-2xl font-bold mb-2">Utilities</h2>
        <div className="mb-6">
          {utilities === undefined ? (
            <div className="text-muted-foreground">Loading utilities...</div>
          ) : utilities.length === 0 ? (
            <div className="text-muted-foreground">No utilities for this property.</div>
          ) : (
            <ul className="list-disc pl-6">
              {utilities.map((u: any) => (
                <li key={u._id}>
                  <span className="font-semibold">{u.name}</span> <span className="text-muted-foreground">({u.provider})</span> - ${u.cost} <span className="text-xs text-muted-foreground">[{u.status}]</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <h2 className="text-2xl font-bold mb-2">Leases</h2>
        <div>
          {leases === undefined ? (
            <div className="text-muted-foreground">Loading leases...</div>
          ) : leases.length === 0 ? (
            <div className="text-muted-foreground">No leases for this property.</div>
          ) : (
            <ul className="list-disc pl-6">
              {leases.map((l: any) => (
                <li key={l._id}>
                  <span className="font-semibold">{l.tenantName}</span> ({l.status})<br />
                  <span className="text-muted-foreground text-sm">{l.startDate} - {l.endDate} | Rent: ${l.rent}</span>
                  {l.tenantEmail && <span className="ml-2 text-muted-foreground text-xs">Email: {l.tenantEmail}</span>}
                  {l.tenantPhone && <span className="ml-2 text-muted-foreground text-xs">Phone: {l.tenantPhone}</span>}
                  {l.leaseDocumentUrl && (
                    <span className="ml-2"><a href={l.leaseDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">Lease Doc</a></span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 