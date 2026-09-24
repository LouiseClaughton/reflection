import { getJson } from "./http";

const API = "https://api.github.com";

async function githubGet(url, token) {
  console.log("GITHUB REQUEST:", url);

  const result = await getJson(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  console.log("GITHUB SUCCESS:", url);

  return result;
}

async function allRepos(token) {
  const configured = (process.env.GITHUB_REPOS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (configured.length) {
    return configured.map((full_name) => {
      const [owner, name] = full_name.split("/");

      return {
        full_name,
        name,
        owner: {
          login: owner,
        },
      };
    });
  }

  const repos = [];

  for (let page = 1; page <= 100; page++) {
    const rows = await githubGet(
      `${API}/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member`,
      token
    );

    repos.push(...rows);

    if (rows.length < 100) {
      break;
    }
  }

  return repos;
}

async function commitsForRepo(
  token,
  repo,
  username,
  since,
  until
) {
  const out = [];

  for (let page = 1; page <= 100; page++) {
    const rows = await githubGet(
      `${API}/repos/${repo.full_name}/commits?author=${encodeURIComponent(
        username
      )}&since=${encodeURIComponent(
        since
      )}&until=${encodeURIComponent(
        until
      )}&per_page=100&page=${page}`,
      token
    );

    out.push(
      ...rows.map((c) => ({
        provider: "github",
        repository: repo.full_name,
        sha: c.sha,
        date: c.commit.author?.date ?? "",
        author:
          c.author?.login ??
          c.commit.author?.email ??
          c.commit.author?.name ??
          "",
        message: c.commit.message.split("\n")[0],
        url: c.html_url,
      }))
    );

    if (rows.length < 100) {
      break;
    }
  }

  return out;
}

export async function fetchGithubCommits(year) {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;

  console.log("GITHUB DEBUG:", {
    tokenLoaded: !!token,
    tokenPrefix: token?.slice(0, 10),
    username,
  });

  if (!token || !username) {
    return [];
  }

  const me = await githubGet(
    `${API}/user`,
    token
  );

  console.log("GITHUB AUTH TEST:", me.login);

  const since = `${year}-01-01T00:00:00Z`;
  const until = `${year + 1}-01-01T00:00:00Z`;

  const repos = await allRepos(token);

  const results = [];

  for (const repo of repos) {
    console.log(
      "PROCESSING REPO:",
      repo.full_name
    );

    try {
      const commits = await commitsForRepo(
        token,
        repo,
        username,
        since,
        until
      );

      console.log(
        "REPO SUCCESS:",
        repo.full_name,
        "commits:",
        commits.length
      );

      results.push(...commits);
    } catch (error) {
      console.error(
        "REPO FAILED:",
        repo.full_name
      );

      console.error(error);

      throw error;
    }
  }

  return results;
}