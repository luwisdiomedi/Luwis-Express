const API_URL = ""; // Relative to host since we're using Vite middleware

export const api = {
  async get(path: string, token?: string) {
    const res = await fetch(`${API_URL}/api${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let message = "Hitilafu imetokea";
      try {
        const error = await res.json();
        message = error.message || message;
      } catch (e) {
        message = `Server Error: ${res.status}`;
      }
      throw new Error(message);
    }
    try {
      return await res.json();
    } catch (e) {
      throw new Error("Invalid response from server");
    }
  },

  async post(path: string, body: any, token?: string) {
    const res = await fetch(`${API_URL}/api${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let message = "Hitilafu imetokea";
      try {
        const error = await res.json();
        message = error.message || message;
      } catch (e) {
        message = `Server Error: ${res.status}`;
      }
      throw new Error(message);
    }
    try {
      return await res.json();
    } catch (e) {
      throw new Error("Invalid response from server");
    }
  },
};
