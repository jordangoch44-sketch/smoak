import type { Trainer } from "@/types/trainer";

interface SocialLinksProps {
  social: Trainer["social"];
}

const socialLabels: Record<keyof Trainer["social"], string> = {
  instagram: "Instagram",
  twitter: "X",
  linkedin: "LinkedIn",
  website: "Website",
};

export function SocialLinks({ social }: SocialLinksProps) {
  const links = Object.entries(social).filter(([, url]) => url);

  if (links.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
        Connect
      </h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {links.map(([key, url]) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-silver-300 transition-colors hover:border-white/20 hover:text-white"
          >
            {socialLabels[key as keyof Trainer["social"]]}
          </a>
        ))}
      </div>
    </section>
  );
}
