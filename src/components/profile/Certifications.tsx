import type { Trainer } from "@/types/trainer";

interface CertificationsProps {
  certifications: Trainer["certifications"];
}

export function Certifications({ certifications }: CertificationsProps) {
  return (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
        Certifications
      </h2>
      <ul className="mt-6 space-y-4">
        {certifications.map((cert) => (
          <li
            key={`${cert.name}-${cert.year}`}
            className="flex items-start justify-between gap-4 border-b border-white/5 pb-4 last:border-0"
          >
            <div>
              <p className="font-medium text-white">{cert.name}</p>
              <p className="mt-0.5 text-sm text-silver-400">{cert.issuer}</p>
            </div>
            <span className="shrink-0 text-sm text-silver-400">
              {cert.year}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
