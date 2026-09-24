"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function makeSummary(commits, year) {
  const monthly = months.map((month, i) => {
    const rows = commits.filter(
      (c) => new Date(c.date).getUTCMonth() === i
    );

    const github = rows.filter(
      (c) => c.provider === "github"
    ).length;

    return {
      month,
      github,
      total: github,
    };
  });

  const daily = {};

  for (const c of commits) {
    const key = c.date.slice(0, 10);
    daily[key] = (daily[key] ?? 0) + 1;
  }

  const repoMap = new Map();

  for (const c of commits) {
    const key = `${c.provider}:${c.repository}`;

    const current = repoMap.get(key) ?? {
      github: 0,
    };

    current[c.provider] += 1;
    repoMap.set(key, current);
  }

  const repositories = [...repoMap.entries()]
    .map(([key, value]) => {
      const [provider, ...name] = key.split(":");

      const github = value.github;

      return {
        name: `${
          provider === "github" ? "GitHub" : ""
        } / ${name.join(":")}`,
        github,
        total: github,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    year,
    total: commits.length,
    github: commits.filter(
      (c) => c.provider === "github"
    ).length,
    monthly,
    daily,
    repositories,
  };
}

function Heatmap({ year, daily }) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));

  const first = new Date(start);

  first.setUTCDate(
    first.getUTCDate() - first.getUTCDay()
  );

  const cells = [];

  for (
    let d = new Date(first);
    d <= end || d.getUTCDay() !== 0;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const key = d.toISOString().slice(0, 10);

    cells.push({
      date: key,
      count: daily[key] ?? 0,
    });
  }

  const max = Math.max(
    1,
    ...cells.map((c) => c.count)
  );

  return (
    <div className="heatmap">
      {cells.map((c) => (
        <div
          key={c.date}
          className="heat-cell"
          title={`${c.date}: ${c.count} commit${
            c.count === 1 ? "" : "s"
          }`}
          style={{
            opacity:
              c.count === 0
                ? 0.12
                : 0.25 + 0.75 * (c.count / max),
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/commits?year=${year}`,
        {
          cache: "no-store",
        }
      );

      const body = await res.json();

      if (!res.ok) {
        throw new Error(
          body.error || "Failed to load commits"
        );
      }

      setSummary(makeSummary(body.commits, year));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [year]);

  const activeDays = useMemo(
    () => (summary ? Object.keys(summary.daily).length : 0),
    [summary]
  );

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>Commit Tracker</h1>
          <p className="muted">
            One yearly view across GitHub.
          </p>
        </div>

        <div className="controls">
          <select
            value={year}
            onChange={(e) =>
              setYear(Number(e.target.value))
            }
          >
            {Array.from(
              { length: 8 },
              (_, i) => currentYear - i
            ).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button onClick={load} disabled={loading}>
            {loading ? "Syncing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      {summary && (
        <>
          <section className="cards">
            <div className="card">
              <span>Total commits</span>
              <strong>{summary.total}</strong>
            </div>

            <div className="card">
              <span>Active days</span>
              <strong>{activeDays}</strong>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>Commits by month</h2>
                <span className="muted">
                  {summary.year}
                </span>
              </div>
            </div>

            <div className="chart">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={summary.monthly}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />

                  <Bar
                    dataKey="github"
                    stackId="a"
                    name="GitHub"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>Activity</h2>
                <span className="muted">
                  Daily commit count
                </span>
              </div>
            </div>

            <Heatmap
              year={year}
              daily={summary.daily}
            />
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Repositories</h2>
            </div>

            <div className="repo-list">
              {summary.repositories.map((repo) => (
                <div
                  className="repo-row"
                  key={repo.name}
                >
                  <span>{repo.name}</span>
                  <strong>{repo.total}</strong>
                </div>
              ))}

              {summary.repositories.length === 0 && (
                <p className="muted">
                  No commits found.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      <footer>
        <span>
          Tokens stay server-side in environment variables.
        </span>
      </footer>
    </main>
  );
}