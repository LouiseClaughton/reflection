export async function getJson(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();

    throw new Error(
      `${res.status} ${res.statusText}: ${text.slice(0, 300)}`
    );
  }

  return res.json();
}