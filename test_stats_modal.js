// Test script to verify statistics modal functionality
const testStatsModal = () => {
  console.log('Testing statistics modal functionality...');
  
  // Check if elements exist
  const statsBtn = document.getElementById('statsBtn');
  const statsModal = document.getElementById('statsModal');
  const closeStatsModal = document.getElementById('closeStatsModal');
  const closeStatsBtn = document.getElementById('closeStatsBtn');
  
  console.log('Elements found:');
  console.log('- statsBtn:', !!statsBtn);
  console.log('- statsModal:', !!statsModal);
  console.log('- closeStatsModal:', !!closeStatsModal);
  console.log('- closeStatsBtn:', !!closeStatsBtn);
  
  // Check if StatsModule exists and is initialized
  console.log('- StatsModule:', !!window.StatsModule);
  
  if (statsBtn && statsModal) {
    console.log('Testing modal open...');
    
    // Test opening modal
    if (window.StatsModule && window.StatsModule.showModal) {
      window.StatsModule.showModal();
      
      // Check if modal is visible after opening
      const isVisible = statsModal.classList.contains('active') || 
                       statsModal.style.display === 'flex' ||
                       getComputedStyle(statsModal).display !== 'none';
      
      console.log('Modal visible after opening:', isVisible);
      
      // Test closing modal
      setTimeout(() => {
        if (window.StatsModule.hideModal) {
          window.StatsModule.hideModal();
          const isHidden = !statsModal.classList.contains('active') && 
                          statsModal.style.display !== 'flex';
          console.log('Modal hidden after closing:', isHidden);
        }
      }, 1000);
    } else {
      console.log('StatsModule.showModal method not found');
    }
  } else {
    console.log('Required elements not found');
  }
};

// Export for use in browser
if (typeof window !== 'undefined') {
  window.testStatsModal = testStatsModal;
}

console.log('Test script loaded. Run testStatsModal() in browser console to test.');