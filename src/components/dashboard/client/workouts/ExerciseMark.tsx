import { useId } from "react";
import { poseForExercise, type ExercisePose } from "@/lib/workouts/exercise-catalog";
import { cn } from "@/lib/utils";

const INK = "#2c2824";
const MUSCLE = "#ff6b4a";
const GEAR = "#3d3834";
const PAPER = "#f7f4ef";
const PAD = "#d4cdc3";

const line = {
  fill: "none" as const,
  stroke: INK,
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Head({ cx, cy, r = 5 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill={PAPER} stroke={INK} strokeWidth="1.6" />;
}

function Bar({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <g fill="none" stroke={GEAR} strokeLinecap="round">
      <path d={`M${x1} ${y}H${x2}`} strokeWidth="2.2" />
      <circle cx={x1 + 2} cy={y} r="4.6" strokeWidth="1.6" />
      <circle cx={x2 - 2} cy={y} r="4.6" strokeWidth="1.6" />
    </g>
  );
}

function PoseArt({ pose }: { pose: ExercisePose }) {
  switch (pose) {
    case "bench":
      return (
        <g>
          <path d="M16 50h36" stroke={PAD} strokeWidth="5" strokeLinecap="round" />
          <path d="M22 50v8M46 50v8" stroke={PAD} strokeWidth="2" strokeLinecap="round" />
          <path d="M54 26v24" stroke={GEAR} strokeWidth="2" strokeLinecap="round" />
          <Head cx={22} cy={44} />
          <path d="M26 45h18" {...line} strokeWidth="3.2" />
          <ellipse cx="34" cy="43" rx="6.2" ry="3.3" fill={MUSCLE} />
          <path d="M32 42V30" {...line} />
          <Bar x1={10} x2={62} y={28} />
        </g>
      );
    case "incline":
      return (
        <g>
          <path d="M14 54 L50 38" stroke={PAD} strokeWidth="5" strokeLinecap="round" />
          <path d="M20 52v8M44 42v10" stroke={PAD} strokeWidth="2" strokeLinecap="round" />
          <Head cx={48} cy={32} />
          <path d="M44 36 L28 48" {...line} strokeWidth="3.2" />
          <ellipse cx="36" cy="40" rx="5.4" ry="3" fill={MUSCLE} transform="rotate(-28 36 40)" />
          <path d="M38 38 L34 26" {...line} />
          <Bar x1={12} x2={58} y={24} />
        </g>
      );
    case "fly":
      return (
        <g>
          <Head cx={36} cy={18} />
          <path d="M36 22v16" {...line} strokeWidth="2.6" />
          <path d="M36 38 L28 58M36 38 L44 58" {...line} />
          <path d="M36 28 L16 38M36 28 L56 38" {...line} />
          <path d="M8 22 L16 38M64 22 L56 38" stroke={GEAR} strokeWidth="1.4" strokeLinecap="round" />
          <ellipse cx="36" cy="30" rx="5.2" ry="3.4" fill={MUSCLE} />
        </g>
      );
    case "dip":
      return (
        <g>
          <path d="M16 24v28M56 24v28" stroke={GEAR} strokeWidth="2.4" strokeLinecap="round" />
          <Head cx={36} cy={26} />
          <path d="M36 30v12" {...line} strokeWidth="2.8" />
          <path d="M36 34 L22 30M36 34 L50 30" {...line} />
          <path d="M36 42 L30 56M36 42 L42 56" {...line} />
          <ellipse cx="36" cy="36" rx="4.4" ry="3" fill={MUSCLE} />
        </g>
      );
    case "pushup":
      return (
        <g>
          <path d="M12 48h48" stroke={PAD} strokeWidth="2" strokeLinecap="round" />
          <Head cx={16} cy={36} />
          <path d="M20 38h28" {...line} strokeWidth="3" />
          <path d="M34 40v8" {...line} />
          <ellipse cx="32" cy="36" rx="6" ry="2.8" fill={MUSCLE} />
          <path d="M48 38 L56 46" {...line} />
        </g>
      );
    case "row":
      return (
        <g>
          <path d="M44 60h16" {...line} strokeWidth="2" />
          <path d="M54 60 L50 46" {...line} />
          <path d="M50 46 L22 32" {...line} strokeWidth="3" />
          <path d="M46 44 L28 34" stroke={MUSCLE} strokeWidth="4" strokeLinecap="round" />
          <Head cx={18} cy={30} />
          <path d="M34 40 L40 52" {...line} />
          <Bar x1={24} x2={56} y={54} />
        </g>
      );
    case "pulldown":
      return (
        <g>
          <path d="M14 16h44" stroke={GEAR} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M28 18 L36 30 L44 18" {...line} />
          <Head cx={36} cy={28} r={3.8} />
          <path d="M36 32v14" {...line} strokeWidth="2.8" />
          <ellipse cx="30" cy="40" rx="3.2" ry="5" fill={MUSCLE} />
          <ellipse cx="42" cy="40" rx="3.2" ry="5" fill={MUSCLE} />
          <path d="M22 50h28" stroke={PAD} strokeWidth="4" strokeLinecap="round" />
          <path d="M36 46h14v8" {...line} />
        </g>
      );
    case "pullup":
      return (
        <g>
          <path d="M12 14h48" stroke={GEAR} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 16 L36 28 L48 16" {...line} />
          <Head cx={36} cy={30} r={3.8} />
          <path d="M36 34v12" {...line} strokeWidth="2.6" />
          <ellipse cx="30" cy="40" rx="2.8" ry="4.4" fill={MUSCLE} />
          <ellipse cx="42" cy="40" rx="2.8" ry="4.4" fill={MUSCLE} />
          <path d="M36 46 L30 58M36 46 L42 58" {...line} />
        </g>
      );
    case "press":
      return (
        <g>
          <Bar x1={14} x2={58} y={16} />
          <path d="M28 20 L36 32 L44 20" {...line} />
          <Head cx={36} cy={34} r={3.8} />
          <path d="M36 38v10" {...line} strokeWidth="2.6" />
          <circle cx="30" cy="36" r="2.8" fill={MUSCLE} />
          <circle cx="42" cy="36" r="2.8" fill={MUSCLE} />
          <path d="M36 48 L28 62M36 48 L44 62" {...line} />
        </g>
      );
    case "raise":
      return (
        <g>
          <Head cx={36} cy={18} />
          <path d="M36 22v16" {...line} strokeWidth="2.6" />
          <path d="M36 28 H16M36 28 H56" {...line} />
          <circle cx="30" cy="27" r="2.7" fill={MUSCLE} />
          <circle cx="42" cy="27" r="2.7" fill={MUSCLE} />
          <circle cx="14" cy="28" r="2.3" fill={GEAR} />
          <circle cx="58" cy="28" r="2.3" fill={GEAR} />
          <path d="M36 38 L28 58M36 38 L44 58" {...line} />
        </g>
      );
    case "rear":
      return (
        <g>
          <Head cx={22} cy={28} />
          <path d="M26 30 L48 42" {...line} strokeWidth="2.8" />
          <path d="M34 34 L22 46M34 34 L46 24" {...line} />
          <circle cx="32" cy="33" r="2.6" fill={MUSCLE} />
          <path d="M48 42 L44 58M48 42 L56 54" {...line} />
        </g>
      );
    case "curl":
      return (
        <g>
          <Head cx={30} cy={16} />
          <path d="M30 20v18" {...line} strokeWidth="2.6" />
          <path d="M30 26c8 1 12 8 7 14" {...line} />
          <ellipse cx="37" cy="30" rx="3.3" ry="4.4" fill={MUSCLE} />
          <path d="M34 42h10" stroke={GEAR} strokeWidth="2" strokeLinecap="round" />
          <circle cx="33" cy="42" r="2.2" fill={GEAR} />
          <circle cx="45" cy="42" r="2.2" fill={GEAR} />
          <path d="M30 38 L24 58M30 38 L38 58" {...line} />
        </g>
      );
    case "pushdown":
      return (
        <g>
          <path d="M36 8v16" stroke={GEAR} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M28 24h16" stroke={GEAR} strokeWidth="2.2" strokeLinecap="round" />
          <Head cx={36} cy={22} r={3.6} />
          <path d="M36 26v14" {...line} strokeWidth="2.6" />
          <path d="M36 30 L28 26 L28 36" {...line} />
          <ellipse cx="30" cy="30" rx="2.4" ry="3.6" fill={MUSCLE} />
          <path d="M36 40 L28 58M36 40 L44 58" {...line} />
        </g>
      );
    case "extension":
      return (
        <g>
          <Head cx={34} cy={28} />
          <path d="M34 32v14" {...line} strokeWidth="2.6" />
          <path d="M34 36 L44 22 L40 16" {...line} />
          <ellipse cx="40" cy="30" rx="2.6" ry="4" fill={MUSCLE} />
          <circle cx="38" cy="15" r="2.2" fill={GEAR} />
          <path d="M34 46 L26 60M34 46 L42 60" {...line} />
        </g>
      );
    case "squat":
      return (
        <g>
          <Bar x1={16} x2={56} y={18} />
          <Head cx={36} cy={26} r={3.6} />
          <path d="M36 30v8" {...line} strokeWidth="2.6" />
          <path d="M36 38 L24 48 L22 62" {...line} />
          <path d="M36 38 L48 48 L50 62" {...line} />
          <ellipse cx="29" cy="44" rx="3.4" ry="5" fill={MUSCLE} transform="rotate(28 29 44)" />
          <ellipse cx="43" cy="44" rx="3.4" ry="5" fill={MUSCLE} transform="rotate(-28 43 44)" />
        </g>
      );
    case "lunge":
      return (
        <g>
          <Head cx={34} cy={14} />
          <path d="M34 18v14" {...line} strokeWidth="2.6" />
          <path d="M34 32 L24 46 L22 60" {...line} />
          <path d="M34 32 L48 48 L58 56" {...line} />
          <ellipse cx="28" cy="40" rx="3.2" ry="5" fill={MUSCLE} transform="rotate(32 28 40)" />
        </g>
      );
    case "legpress":
      return (
        <g>
          <path d="M16 40 L30 28h8L28 48z" fill={PAD} />
          <Head cx={24} cy={36} r={3.6} />
          <path d="M28 38 L44 30" {...line} strokeWidth="2.6" />
          <path d="M40 34 L54 22 L62 26" {...line} />
          <path d="M18 18h28" stroke={GEAR} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="46" cy="28" rx="4" ry="2.6" fill={MUSCLE} transform="rotate(-32 46 28)" />
        </g>
      );
    case "legext":
      return (
        <g>
          <path d="M14 40h22v10H18z" fill={PAD} />
          <Head cx={20} cy={32} r={3.6} />
          <path d="M24 36h12" {...line} strokeWidth="2.6" />
          <path d="M36 38 L56 36" {...line} />
          <ellipse cx="40" cy="36" rx="4.2" ry="2.6" fill={MUSCLE} />
          <path d="M52 34v8" stroke={GEAR} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "hinge":
      return (
        <g>
          <path d="M18 58h14" {...line} />
          <path d="M28 58 L34 44" {...line} />
          <path d="M34 44 L58 36" {...line} strokeWidth="2.8" />
          <Head cx={60} cy={32} r={3.6} />
          <path d="M46 40 L40 52" {...line} />
          <ellipse cx="32" cy="50" rx="3" ry="5.2" fill={MUSCLE} transform="rotate(-18 32 50)" />
          <Bar x1={30} x2={58} y={54} />
        </g>
      );
    case "legcurl":
      return (
        <g>
          <path d="M12 44h40" stroke={PAD} strokeWidth="5" strokeLinecap="round" />
          <Head cx={18} cy={38} />
          <path d="M22 40h24" {...line} strokeWidth="3" />
          <path d="M46 40 L56 30" {...line} />
          <ellipse cx="40" cy="38" rx="6" ry="2.6" fill={MUSCLE} />
        </g>
      );
    case "thrust":
      return (
        <g>
          <path d="M12 42h10v14H12z" fill={PAD} />
          <Head cx={20} cy={38} r={3.6} />
          <path d="M24 40 H46" {...line} strokeWidth="3" />
          <path d="M46 40 L54 52 L62 52" {...line} />
          <circle cx="40" cy="38" r="3.4" fill={MUSCLE} />
          <path d="M30 36h16" stroke={GEAR} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case "kickback":
      return (
        <g>
          <Head cx={28} cy={18} />
          <path d="M28 22v16" {...line} strokeWidth="2.6" />
          <path d="M28 38 L22 56" {...line} />
          <path d="M28 38 L46 46" {...line} />
          <circle cx="32" cy="36" r="3" fill={MUSCLE} />
          <path d="M40 28h12" stroke={GEAR} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case "calf":
      return (
        <g>
          <path d="M22 54h28v6H22z" fill={PAD} />
          <Head cx={36} cy={16} />
          <path d="M36 20v18" {...line} strokeWidth="2.6" />
          <path d="M36 38 L30 54M36 38 L42 50" {...line} />
          <ellipse cx="40" cy="46" rx="2.6" ry="4.2" fill={MUSCLE} />
        </g>
      );
    case "plank":
      return (
        <g>
          <path d="M14 50h44" stroke={PAD} strokeWidth="2" strokeLinecap="round" />
          <Head cx={18} cy={38} />
          <path d="M22 40h30" {...line} strokeWidth="3" />
          <path d="M30 42v8M48 40 L54 50" {...line} />
          <ellipse cx="34" cy="38" rx="6" ry="2.6" fill={MUSCLE} />
        </g>
      );
    case "crunch":
      return (
        <g>
          <path d="M14 50h40" stroke={PAD} strokeWidth="2" strokeLinecap="round" />
          <path d="M22 48 L34 36" {...line} strokeWidth="3" />
          <Head cx={36} cy={32} />
          <path d="M34 46h16" {...line} />
          <ellipse cx="30" cy="42" rx="4" ry="2.8" fill={MUSCLE} transform="rotate(-40 30 42)" />
        </g>
      );
    case "legraise":
      return (
        <g>
          <path d="M16 14h40" stroke={GEAR} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M28 16v10M44 16v10" {...line} />
          <Head cx={36} cy={30} r={3.6} />
          <path d="M36 34v10" {...line} strokeWidth="2.6" />
          <path d="M36 40 L26 32 L22 26" {...line} />
          <ellipse cx="36" cy="40" rx="3.4" ry="2.8" fill={MUSCLE} />
        </g>
      );
    default:
      return (
        <g>
          <Head cx={36} cy={18} />
          <path d="M36 22v16" {...line} strokeWidth="2.6" />
          <path d="M36 28 L24 36M36 28 L48 36" {...line} />
          <path d="M36 38 L28 58M36 38 L44 58" {...line} />
        </g>
      );
  }
}

/** Small original drawing of the exercise, used beside its name. */
export function ExerciseMark({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const clipId = useId().replace(/:/g, "");
  const pose = poseForExercise(name);

  return (
    <svg className={cn("exercise-mark", className)} viewBox="0 0 72 72" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <circle cx="36" cy="36" r="36" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <circle cx="36" cy="36" r="36" fill={PAPER} />
        <g transform="translate(36 36) scale(1.38) translate(-36 -36)">
          <PoseArt pose={pose} />
        </g>
      </g>
    </svg>
  );
}
