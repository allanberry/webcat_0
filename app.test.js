const app = require('./app');

test('builtWith returns a string', () => {
  expect(app.sum(1, 2)).toBe(3);
});