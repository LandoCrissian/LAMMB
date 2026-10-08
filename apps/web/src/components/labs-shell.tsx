import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { facilityDestinations, type FacilityId } from '../config/labs';
export function LabsShell({
  title,
  eyebrow,
  destination,
  children,
  overview = false,
}: {
  title: string;
  eyebrow: string;
  destination?: FacilityId;
  children: ReactNode;
  overview?: boolean;
}) {
  return (
    <div className={`labs ${overview ? 'labs-overview' : ''}`}>
      <div className="labs-environment" aria-hidden="true">
        <Image
          src="/art/labs-preview/facility.webp"
          alt=""
          width={1536}
          height={1024}
          sizes="100vw"
          preload
        />
      </div>
      <div className="labs-topline">
        <Link href="/universe" aria-label="LAMMB Labs facility directory">
          LAMMB LABS <span aria-hidden="true">/</span> FACILITY DIRECTORY
        </Link>
        <span className="labs-fiction-label">FICTIONAL ARCHIVE</span>
      </div>
      <nav className="labs-navigation" aria-label="Laboratory destinations">
        {facilityDestinations.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={destination === item.id ? 'page' : undefined}
          >
            <span aria-hidden="true">{item.code}</span> {item.label}
          </Link>
        ))}
      </nav>
      <div className="labs-content">
        <div className="labs-heading">
          <p className="labs-kicker">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {children}
      </div>
      <p className="labs-disclaimer">
        Original fictional satire. No actual research, financial products or
        blockchain events are reported. Story specimen numbers are not token
        assignments. Final characters and traits are not exposed here.
      </p>
    </div>
  );
}
