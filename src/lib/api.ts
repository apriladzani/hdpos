// --- API Helper ---
export const api = {
  get: (url: string) => fetch(url).then(res => res.json()),
  post: (url: string, data: any) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => {
    if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error occurred'); });
    return res.json();
  }),
  put: (url: string, data: any) => fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => {
    if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error occurred'); });
    return res.json();
  }),
  delete: (url: string) => fetch(url, { method: 'DELETE' }).then(res => {
    if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error occurred'); });
    return res.json();
  })
};
