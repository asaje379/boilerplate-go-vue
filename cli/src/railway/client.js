const RAILWAY_GRAPHQL_ENDPOINT = "https://backboard.railway.com/graphql/v2";

export function getRailwayApiAuth(env = process.env) {
  if (env.RAILWAY_API_TOKEN) {
    return {
      headers: {
        Authorization: `Bearer ${env.RAILWAY_API_TOKEN}`,
      },
    };
  }

  if (env.RAILWAY_TOKEN) {
    return {
      headers: {
        "Project-Access-Token": env.RAILWAY_TOKEN,
      },
    };
  }

  return null;
}

export async function fetchRailwayProjectServices(projectId, options = {}) {
  const auth = options.auth || getRailwayApiAuth(options.env);
  if (!auth || !projectId) {
    return [];
  }

  try {
    const fetchImpl = options.fetchImpl || fetch;
    const response = await fetchImpl(options.endpoint || RAILWAY_GRAPHQL_ENDPOINT, {
      body: JSON.stringify({
        query: `query SetupRailwayServices($projectId: String!) {
          project(id: $projectId) {
            services {
              edges {
                node {
                  id
                  name
                  icon
                }
              }
            }
          }
        }`,
        variables: {
          projectId,
        },
      }),
      headers: {
        ...auth.headers,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const nodes = payload?.data?.project?.services?.edges || [];
    return nodes
      .map((edge) => edge?.node)
      .filter(Boolean)
      .map((service) => ({
        icon: typeof service.icon === "string" ? service.icon : null,
        id: typeof service.id === "string" ? service.id : null,
        name: typeof service.name === "string" ? service.name : null,
      }));
  } catch {
    return [];
  }
}
