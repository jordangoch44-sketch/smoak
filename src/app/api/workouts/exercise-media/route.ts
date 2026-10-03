import { NextResponse } from "next/server";
import {
  exerciseDbConfigured,
  exerciseGuide,
  libraryExerciseMedia,
} from "@/lib/workouts/exercisedb";

export const maxDuration = 60;

/** Stills for the exercise library, or the GIF and how-to when `name` is set. */
export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!exerciseDbConfigured()) {
    return NextResponse.json({
      configured: false,
      media: {},
      gifUrl: null,
      overview: null,
      instructions: [],
    });
  }

  try {
    if (name) {
      const guide = await exerciseGuide(name);
      return NextResponse.json({ configured: true, ...guide });
    }
    const media = await libraryExerciseMedia();
    return NextResponse.json({ configured: true, media });
  } catch {
    return NextResponse.json({ configured: true, media: {}, gifUrl: null });
  }
}
