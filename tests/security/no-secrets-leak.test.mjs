import test from 'node:test';
import assert from 'node:assert/strict';

// Función simple de redacción de secretos
function redactSecrets(text) {
  if (typeof text !== 'string') return text;
  
  // Patrones comunes de secretos
  const patterns = [
    { regex: /sk_live_[a-zA-Z0-9]+/g, replacement: '[REDACTED_LIVE_KEY]' },
    { regex: /sk_test_[a-zA-Z0-9]+/g, replacement: '[REDACTED_TEST_KEY]' },
    { regex: /ghp_[a-zA-Z0-9]+/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
    { regex: /gho_[a-zA-Z0-9]+/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
    { regex: /ghu_[a-zA-Z0-9]+/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
    { regex: /ghs_[a-zA-Z0-9]+/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
    { regex: /ghr_[a-zA-Z0-9]+/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
    { regex: /password\s*=\s*['"]\w+['"]/gi, replacement: 'password=[REDACTED]' },
    { regex: /api[_-]?key\s*=\s*['"]?\w+['"]?/gi, replacement: 'api_key=[REDACTED]' },
    { regex: /secret\s*=\s*['"]?\w+['"]?/gi, replacement: 'secret=[REDACTED]' },
    { regex: /token\s*=\s*['"]\w+['"]/gi, replacement: 'token=[REDACTED]' }
  ];
  
  let redacted = text;
  patterns.forEach(({ regex, replacement }) => {
    redacted = redacted.replace(regex, replacement);
  });
  
  return redacted;
}

test('Redacción de secretos en payloads', () => {
  const sensitiveText = 'key=sk_live_ABC123; token=ghp_XXXX; password="secret123"';
  const redacted = redactSecrets(sensitiveText);
  
  assert.doesNotMatch(redacted, /sk_live_/, 'No debe contener live keys');
  assert.doesNotMatch(redacted, /ghp_/, 'No debe contener GitHub tokens');
  assert.doesNotMatch(redacted, /secret123/, 'No debe contener passwords');
  
  assert.match(redacted, /REDACTED/, 'Debe contener texto de redacción');
});

test('Redacción de diferentes tipos de secretos', () => {
  // Test 1: API key
  const apiKeyInput = 'api_key=abc123def456';
  const apiKeyRedacted = redactSecrets(apiKeyInput);
  assert.doesNotMatch(apiKeyRedacted, /abc123def456/, 'No debe contener API key original');
  
  // Test 2: Secret
  const secretInput = 'secret=xyz789';
  const secretRedacted = redactSecrets(secretInput);
  assert.doesNotMatch(secretRedacted, /xyz789/, 'No debe contener secret original');
  
  // Test 3: Password
  const passwordInput = 'password="mypassword"';
  const passwordRedacted = redactSecrets(passwordInput);
  assert.doesNotMatch(passwordRedacted, /mypassword/, 'No debe contener password original');
});

test('Redacción preserva texto no sensible', () => {
  const safeText = 'This is a normal message with no secrets';
  const redacted = redactSecrets(safeText);
  
  assert.equal(redacted, safeText, 'Texto seguro debe permanecer igual');
});

test('Redacción maneja objetos complejos', () => {
  const complexObject = {
    message: 'key=sk_live_ABC123; normal text',
    nested: {
      secret: 'token=ghp_XXXX',
      public: 'This is public'
    }
  };
  
  const redacted = redactSecrets(JSON.stringify(complexObject));
  
  assert.doesNotMatch(redacted, /sk_live_/, 'No debe contener live keys en objetos');
  assert.doesNotMatch(redacted, /ghp_/, 'No debe contener tokens en objetos');
  assert.ok(redacted.includes('normal text'), 'Debe preservar texto normal');
  assert.ok(redacted.includes('public'), 'Debe preservar contenido público');
});
