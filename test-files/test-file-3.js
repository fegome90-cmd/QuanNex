// Test file 3 for real testing
const config = {
  port: 3000,
  host: 'localhost'
};

// console.log removed for production

// Long function that should be refactored
function veryLongFunctionThatDoesTooMuch() {
  const step1 = 'first step';
  // console.log removed for production

  const step2 = 'second step';
  // console.log removed for production

  const step3 = 'third step';
  // console.log removed for production

  const step4 = 'fourth step';
  // console.log removed for production

  const step5 = 'fifth step';
  // console.log removed for production

  const step6 = 'sixth step';
  // console.log removed for production

  const step7 = 'seventh step';
  // console.log removed for production

  const step8 = 'eighth step';
  // console.log removed for production

  const step9 = 'ninth step';
  // console.log removed for production

  const step10 = 'tenth step';
  // console.log removed for production

  return (
    step1 +
    step2 +
    step3 +
    step4 +
    step5 +
    step6 +
    step7 +
    step8 +
    step9 +
    step10
  );
}

// Magic numbers
const delay = 1000;
setTimeout(() => {
  // console.log removed for production
}, delay);

veryLongFunctionThatDoesTooMuch();
