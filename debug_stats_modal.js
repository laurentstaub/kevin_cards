// Debug script for statistics modal - run in browser console
console.log('=== Statistics Modal Debug ===');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runDebug);
} else {
  runDebug();
}

function runDebug() {
  console.log('Running statistics modal debug...');
  
  // Check DOM elements
  const statsBtn = document.getElementById('statsBtn');
  const statsModal = document.getElementById('statsModal');
  const closeStatsModal = document.getElementById('closeStatsModal');
  const closeStatsBtn = document.getElementById('closeStatsBtn');
  
  console.log('DOM Elements:');
  console.log('- statsBtn:', statsBtn ? 'Found' : 'NOT FOUND');
  console.log('- statsModal:', statsModal ? 'Found' : 'NOT FOUND');
  console.log('- closeStatsModal:', closeStatsModal ? 'Found' : 'NOT FOUND');
  console.log('- closeStatsBtn:', closeStatsBtn ? 'Found' : 'NOT FOUND');
  
  // Check modules
  console.log('\nModules:');
  console.log('- StatsModule:', window.StatsModule ? 'Loaded' : 'NOT LOADED');
  console.log('- ProgressTracker:', window.ProgressTracker ? 'Loaded' : 'NOT LOADED');
  
  if (statsModal) {
    console.log('\nModal current state:');
    console.log('- Display:', getComputedStyle(statsModal).display);
    console.log('- Visibility:', getComputedStyle(statsModal).visibility);
    console.log('- Opacity:', getComputedStyle(statsModal).opacity);
    console.log('- Classes:', Array.from(statsModal.classList));
    console.log('- Z-index:', getComputedStyle(statsModal).zIndex);
  }
  
  // Test manual modal opening
  if (statsModal) {
    console.log('\nTesting manual modal opening...');
    
    // Method 1: Add active class
    statsModal.classList.add('active');
    console.log('Added active class - visible now?', getComputedStyle(statsModal).opacity !== '0');
    
    setTimeout(() => {
      statsModal.classList.remove('active');
      console.log('Removed active class');
      
      // Method 2: Direct style
      setTimeout(() => {
        statsModal.style.display = 'flex';
        statsModal.style.opacity = '1';
        statsModal.style.visibility = 'visible';
        console.log('Set direct styles - visible now?', getComputedStyle(statsModal).display === 'flex');
        
        setTimeout(() => {
          statsModal.style.display = '';
          statsModal.style.opacity = '';
          statsModal.style.visibility = '';
          console.log('Reset styles');
        }, 1000);
      }, 500);
    }, 1000);
  }
  
  // Test StatsModule methods
  if (window.StatsModule) {
    console.log('\nTesting StatsModule...');
    setTimeout(() => {
      try {
        console.log('Calling StatsModule.showModal()...');
        window.StatsModule.showModal();
        if (statsModal) {
          console.log('Modal state after showModal:', {
            display: getComputedStyle(statsModal).display,
            opacity: getComputedStyle(statsModal).opacity,
            classes: Array.from(statsModal.classList)
          });
        }
      } catch (error) {
        console.error('Error with StatsModule.showModal():', error);
      }
    }, 3000);
  }
  
  // Test button click
  if (statsBtn) {
    console.log('\nTesting button click...');
    setTimeout(() => {
      console.log('Simulating button click...');
      statsBtn.click();
      if (statsModal) {
        console.log('Modal state after button click:', {
          display: getComputedStyle(statsModal).display,
          opacity: getComputedStyle(statsModal).opacity,
          classes: Array.from(statsModal.classList)
        });
      }
    }, 4000);
  }
}

console.log('Debug script ready. Will auto-run when DOM is ready.');