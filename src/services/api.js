const API = "http://localhost:5000";

export async function getTemplates(token) {
  const res = await fetch(`${API}/templates`, {
    headers: {
      Authorization: token,
    },
  });

  return res.json();
}

export async function getDefaultTemplate(token) {
  const res = await fetch(
    `${API}/default-template`,
    {
      headers: {
        Authorization: token,
      },
    }
  );

  return res.json();
}

export async function login(username, password) {

  const res = await fetch(`${API}/login`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      username,
      password,
    }),
  });

  return res.json();
}