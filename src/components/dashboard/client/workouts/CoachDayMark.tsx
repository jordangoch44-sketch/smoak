import { CheckIcon } from "@/components/ui/icons";

/** Dashed circle while a coach workout is open; filled blue check once finished. */
export function CoachDayMark({ done = false }: { done?: boolean }) {
  if (done) {
    return (
      <span className="client-workouts-cal__coach client-workouts-cal__coach--done" aria-hidden>
        <span className="client-workouts-cal__check">
          <CheckIcon />
        </span>
      </span>
    );
  }
  return <span className="client-workouts-cal__coach" aria-hidden />;
}
