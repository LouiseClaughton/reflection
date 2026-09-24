import { NextResponse } from "next/server";
import { fetchGithubCommits } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(request) {
    const year = Number(new URL(request.url).searchParams.get("year"));

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    try {
        const github = await fetchGithubCommits(year);

        const commits = github.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return NextResponse.json({
            year,
            count: commits.length,
            commits,
            providers: {
                github: github.length
            }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("API ERROR:", error);

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
