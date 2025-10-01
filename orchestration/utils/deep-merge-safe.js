export function deepMergeSafe(target, ...sources) {
  const output = target && typeof target === 'object' ? target : {};

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;

    for (const [key, value] of Object.entries(source)) {
      if (Object.prototype.hasOwnProperty.call(Object.prototype, key)) {
        continue;
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        output[key] = deepMergeSafe(
          output[key] && typeof output[key] === 'object' ? output[key] : {},
          value
        );
      } else {
        output[key] = value;
      }
    }
  }

  return output;
}

export default deepMergeSafe;
