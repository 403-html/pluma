(function () {
  try {
    const t = localStorage.getItem('pluma-theme');
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (t === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // 'system' or no stored preference — mirror OS preference so CSS only needs one dark block
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  } catch {
    // Ignore errors (e.g., localStorage not available)
  }
})();
