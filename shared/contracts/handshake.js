// contracts/handshake.js
export const HELLO_TYPE = "hello";

export function hello(agent, version = "1.0.0") {
  return {
    type: HELLO_TYPE,
    agent,
    version,
    ts: new Date().toISOString(),
  };
}

export function isHello(msg) {
  return msg && msg.type === HELLO_TYPE && typeof msg.agent === "string";
}
