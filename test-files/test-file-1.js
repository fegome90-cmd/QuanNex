// Test file for real testing
const x = 1;
const y = 2;
const z = x + y;

console.log('Sum:', z);

function badFunction() {
  const temp = 'hello';
  console.log(temp);
  return temp;
}

// Magic numbers
setTimeout(function () {
  console.log('Timeout after 5000ms');
}, 5000);

// Inconsistent quotes
const message = 'Hello world';
const other = 'Another message';

// Missing semicolons
const a = 1;
const b = 2;

// Unused variable
const unused = 'not used';

badFunction();
