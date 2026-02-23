(function () {
  try {
    const t = localStorage.getItem('pluma-theme');
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (t === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch {
    // Ignore errors (e.g., localStorage not available)
  }
})();
