// contracts/schema.js
export const MIN_REQ_FIELDS = [
  "requestId",
  "agent",
  "capability",
  "payload",
  "ts",
];

export function validateReq(obj) {
  return MIN_REQ_FIELDS.every((k) => k in obj);
}

export function ok(res) {
  return { ...res, ok: true, ts: new Date().toISOString() };
}

export function fail(err) {
  return { ok: false, error: String(err), ts: new Date().toISOString() };
}
