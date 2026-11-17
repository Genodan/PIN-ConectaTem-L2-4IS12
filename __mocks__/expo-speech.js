module.exports = {
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  isSpeakingAsync: jest.fn(async () => false),
  pause: jest.fn(),
  resume: jest.fn(),
};
