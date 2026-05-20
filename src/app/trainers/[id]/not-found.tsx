import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function TrainerNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-24 text-center">
      <h1 className="text-4xl font-light text-white">Trainer not found</h1>
      <p className="mt-4 text-silver-400">
        The trainer you&apos;re looking for doesn&apos;t exist or has been
        removed.
      </p>
      <div className="mt-8 flex gap-4">
        <Button href="/explore">Explore Trainers</Button>
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-white/20 px-8 py-3.5 text-sm text-white transition-colors hover:border-white/40"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
