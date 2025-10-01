// Test file for repair validation
const testData = {
  name: 'test',
  value: 42
};

function testFunction(input) {
  const result = input * 2;
  return result;
}

// Test execution
const result = testFunction(21);
console.log('Test result:', result);

module.exports = { testFunction, testData };
