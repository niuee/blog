// Reset scroll position on page load
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
document.documentElement.scrollTop = 0;
document.body.scrollTop = 0;

// Prevent scroll when toggling dark mode
const darkModeToggle = document.getElementById('dark-mode-toggle') as HTMLInputElement | null;
const darkModeLabel = document.querySelector('.dark-mode-label') as HTMLLabelElement | null;

if (darkModeToggle && darkModeLabel) {
  // Store scroll position before toggle
  let scrollPosition = 0;
  
  darkModeLabel.addEventListener('mousedown', () => {
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  });
  
  darkModeLabel.addEventListener('click', (e) => {
    // Prevent default behavior that might cause scrolling
    e.preventDefault();
    
    // Toggle the checkbox manually
    darkModeToggle.checked = !darkModeToggle.checked;
    
    // Restore scroll position after a brief delay
    setTimeout(() => {
      window.scrollTo(0, scrollPosition);
      if (document.documentElement.scrollTop !== scrollPosition) {
        document.documentElement.scrollTop = scrollPosition;
      }
      if (document.body.scrollTop !== scrollPosition) {
        document.body.scrollTop = scrollPosition;
      }
    }, 0);
  });
  
  // Also prevent focus on the checkbox
  darkModeToggle.addEventListener('focus', (e) => {
    e.preventDefault();
    darkModeToggle.blur();
  });
}
