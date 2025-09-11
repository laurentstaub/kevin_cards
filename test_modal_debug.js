// Debug script to test statistics modal
console.log('=== Statistics Modal Debug Test ===');

// Check if DOM elements exist
const statsBtn = document.getElementById('statsBtn');
const statsModal = document.getElementById('statsModal');
const closeStatsModal = document.getElementById('closeStatsModal');
const closeStatsBtn = document.getElementById('closeStatsBtn');

console.log('DOM Elements Check:');
console.log('statsBtn:', statsBtn ? 'Found' : 'NOT FOUND');
console.log('statsModal:', statsModal ? 'Found' : 'NOT FOUND');
console.log('closeStatsModal:', closeStatsModal ? 'Found' : 'NOT FOUND');
console.log('closeStatsBtn:', closeStatsBtn ? 'Found' : 'NOT FOUND');

// Check if modules are loaded
console.log('\nModules Check:');
console.log('StatsModule:', typeof window.StatsModule !== 'undefined' ? 'Loaded' : 'NOT LOADED');
console.log('ProgressTracker:', typeof window.ProgressTracker !== 'undefined' ? 'Loaded' : 'NOT LOADED');

// Check current modal styles
if (statsModal) {
    console.log('\nModal Current State:');
    console.log('display:', getComputedStyle(statsModal).display);
    console.log('visibility:', getComputedStyle(statsModal).visibility);
    console.log('classList:', Array.from(statsModal.classList));
}

// Test opening modal directly
if (statsModal) {
    console.log('\nTesting direct modal show...');
    statsModal.style.display = 'flex';
    console.log('Modal display after setting to flex:', getComputedStyle(statsModal).display);
    
    // Hide it again after 2 seconds
    setTimeout(() => {
        statsModal.style.display = 'none';
        console.log('Modal hidden again');
    }, 2000);
}

// Test StatsModule methods if available
if (window.StatsModule) {
    console.log('\nTesting StatsModule methods...');
    try {
        setTimeout(() => {
            console.log('Calling StatsModule.showModal()...');
            window.StatsModule.showModal();
        }, 3000);
    } catch (error) {
        console.error('Error calling StatsModule.showModal():', error);
    }
}

console.log('=== Debug Test Complete ===');