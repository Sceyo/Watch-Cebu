import { getPowerAdvisoriesSnapshot, GitHubSnapshotSource } from "../server/api.js";

// Production Vercel Serverless Function for /api/power
// Fetches snapshot from public GitHub repository at runtime and CDN-caches it at edge.
const githubSource = new GitHubSnapshotSource();

export default async function handler(req: any, res: any) {
  const result = await getPowerAdvisoriesSnapshot({ snapshotSource: githubSource });

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
  const result = await getPowerAdvisoriesSnapshot({ snapshotSource: githubSource });
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
