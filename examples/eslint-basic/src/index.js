export function add(a, b) {
  return a + b;
}

if (process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.log('Example running');
}

