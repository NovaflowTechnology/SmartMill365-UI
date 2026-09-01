const API_BASE = "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("token");

const parseResponse = async (response) => {
  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      "Server returned an invalid response"
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error || "Request failed"
    );
  }

  return data;
};

const request = async (
  path,
  options = {}
) => {
  const token = getToken();

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers: {
        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
        ...(token
          ? {
              Authorization: token,
            }
          : {}),
        ...(options.headers || {}),
      },
    }
  );

  return parseResponse(response);
};

export const listProcessFlows = () =>
  request("/process-flows");

export const getProcessFlow = (id) =>
  request(`/process-flows/${id}`);

export const createProcessFlow = ({
  name,
  description = "",
  topology = {},
  org_id,
}) =>
  request("/process-flows", {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      topology,
      ...(org_id ? { org_id } : {}),
    }),
  });

export const updateProcessFlow = (
  id,
  patch
) =>
  request(`/process-flows/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });

export const deleteProcessFlow = (id) =>
  request(`/process-flows/${id}`, {
    method: "DELETE",
  });

export const duplicateProcessFlow = async (
  flow,
  name
) =>
  createProcessFlow({
    name:
      name ||
      `${flow?.name || "Process Flow"} Copy`,
    description:
      flow?.description || "",
    topology:
      flow?.topology || {
        nodes: [],
        connections: [],
        mode: "hybrid",
      },
    org_id: flow?.org_id,
  });
