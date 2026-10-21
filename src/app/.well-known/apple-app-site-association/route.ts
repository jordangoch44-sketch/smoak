import { NextResponse } from "next/server";

/** Lets an installed app open /w/<token> from Messages. */
export function GET() {
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: "2TKGS8R8MJ.com.smoac.app",
            paths: ["/w/*"],
          },
        ],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
