import { getEarthquakeEventsSnapshot, GitHubSnapshotSource, FileSnapshotSource } from "../server/api.js";

// Production Vercel Serverless Function for /api/earthquakes
// Fetches snapshot from public GitHub repository at runtime in production (and local files during test/dev).
function getSnapshotSource() {
  if (process.env.WATCH_CEBU_USE_SNAPSHOT === "true") {
    return new FileSnapshotSource();
  }
  return new GitHubSnapshotSource();
}

export default async function handler(req: any, res: any) {
  const result = await getEarthquakeEventsSnapshot({ snapshotSource: getSnapshotSource() });

  if (res && typeof res.setHeader === "function") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.statusCode = 200;
    res.end(JSON.stringify(result));
    return;
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export async function GET(request: Request) {
  const result = await getEarthquakeEventsSnapshot({ snapshotSource: getSnapshotSource() });
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
