const H = { "X-TMD": "1" };
async function req(method, url, body) {
  const opt = { method, headers: { ...H } };
  if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  let j = null;
  try { j = await r.json(); } catch { /* non-JSON */ }
  if (!r.ok) { const e = new Error((j && (j.error || (j.errors && j.errors.join("; ")))) || `${r.status} ${r.statusText}`); e.data = j; throw e; }
  return j;
}
export const api = {
  get: (u) => req("GET", u), put: (u, b) => req("PUT", u, b), post: (u, b) => req("POST", u, b), del: (u) => req("DELETE", u),
  upload: async (project, folder, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open("POST", `/api/p/${project}/upload?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(file.name)}`);
      x.setRequestHeader("X-TMD", "1");
      x.upload.onprogress = (e) => onProgress && onProgress(e.loaded / e.total);
      x.onload = () => { try { const j = JSON.parse(x.responseText); x.status < 300 ? resolve(j) : reject(new Error(j.error)); } catch { reject(new Error("upload failed")); } };
      x.onerror = () => reject(new Error("network error"));
      x.send(file);
    });
  },
};
export const media = (project, rel, bust) => `/media/${project}/${rel.split("/").map(encodeURIComponent).join("/")}${bust ? `?v=${bust}` : ""}`;
