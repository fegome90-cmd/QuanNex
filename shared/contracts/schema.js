// contracts/schema.js
export const MIN_REQ_FIELDS = [
  "requestId",
  "agent",
  "capability",
  "payload",
  "ts",
];

export function validateReq(obj) {
  const isValid = MIN_REQ_FIELDS.every((k) => k in obj);
  return { valid: isValid, error: isValid ? null : `Missing required fields: ${MIN_REQ_FIELDS.filter(k => !(k in obj)).join(', ')}` };
}

export function ok(res) {
  return { ...res, ok: true, ts: new Date().toISOString() };
}

export function fail(err) {
  return { ok: false, error: String(err), ts: new Date().toISOString() };
}
