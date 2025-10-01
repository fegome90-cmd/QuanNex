export function add(a, b) {
  return a + b;
}

if (process.env.NODE_ENV !== 'test') {
  console.log('Example running');
}
