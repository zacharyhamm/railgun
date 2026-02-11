const RAILWAY_GRAPHQL_URL = "https://backboard.railway.com/graphql/v2";

export async function railwayQuery(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
) {
  const res = await fetch(RAILWAY_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Railway API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: unknown;
    errors?: { message: string }[];
  };

  if (json.errors?.length) {
    console.error(
      "Railway GraphQL errors:",
      JSON.stringify(json.errors, null, 2),
    );
    console.error("Query:", query);
    console.error("Variables:", JSON.stringify(variables, null, 2));
    throw new Error(`Railway GraphQL error: ${json.errors[0].message}`);
  }

  return json.data;
}
