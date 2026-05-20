import Link from "next/link";

const footerLinks = {
  Platform: [
    { label: "Explore Trainers", href: "/explore" },
    { label: "Categories", href: "/#categories" },
    { label: "How It Works", href: "/#how-it-works" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
  ],
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Privacy", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-graphite-900">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="text-lg font-semibold tracking-[0.2em] text-white"
            >
              SMOAK
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-silver-400">
              The premier marketplace for elite personal training. Curated
              coaches. Exceptional results.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-xs font-medium uppercase tracking-widest text-silver-300">
                {title}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-silver-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-xs text-silver-400">
            © {new Date().getFullYear()} SMOAK. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-xs text-silver-400 transition-colors hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-xs text-silver-400 transition-colors hover:text-white"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-xs text-silver-400 transition-colors hover:text-white"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
