import '@testing-library/jest-dom';

// jsdom doesn't implement matchMedia - ThemeContext reads it on init
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addListener: () => {}, removeListener: () => {} };
};
