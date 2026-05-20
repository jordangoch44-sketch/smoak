"use client";

import { Button } from "@/components/ui/Button";

interface BookConsultationProps {
  trainerName: string;
}

export function BookConsultation({ trainerName }: BookConsultationProps) {
  function handleBook() {
    alert(
      `Consultation booking for ${trainerName} would open here. This is a demo.`
    );
  }

  return (
    <div className="sticky top-28 rounded-2xl border border-white/5 bg-graphite-900 p-6 lg:p-8">
      <h3 className="text-lg font-medium text-white">Book a Consultation</h3>
      <p className="mt-2 text-sm leading-relaxed text-silver-400">
        Schedule a complimentary 15-minute call to discuss your goals and
        determine if this trainer is the right fit.
      </p>
      <div className="mt-6">
        <Button
          variant="primary"
          className="w-full"
          onClick={handleBook}
        >
          Book Consultation
        </Button>
      </div>
      <p className="mt-4 text-center text-xs text-silver-400">
        Free · No commitment required
      </p>
    </div>
  );
}
