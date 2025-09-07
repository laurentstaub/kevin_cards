# Public Directory Modularization Plan

## Current State Analysis

### Existing Modular Files (Already Following Admin Pattern):
- `session-setup.js` - ✅ Already modularized with IIFE
- `progress.js` - ✅ Already modularized with IIFE  

### Files Requiring Modularization:
- `scripts.js` (1250 lines) - Large monolithic file in IIFE
- `index.html` - Inline HTML without templates

## Proposed Module Structure

### 1. Core Modules to Extract from scripts.js:

#### `modules/flashcard-module.js`
**Responsibilities:**
- Flashcard display and navigation
- Card flipping functionality
- Question/answer rendering
- Functions: `initFlashcards()`, `showCard()`, `flipCard()`, `nextCard()`

#### `modules/ui-helpers.js`
**Responsibilities:**
- Theme management
- HTML template rendering
- Utility functions for DOM manipulation
- Functions: `initTheme()`, `toggleTheme()`, `renderCardContent()`

#### `modules/filter-module.js`
**Responsibilities:**
- Tag filtering functionality
- Modal management for filters
- Tag search and selection
- Functions: `showTagModal()`, `populateTagCategories()`, `applyFilters()`

#### `modules/stats-module.js`
**Responsibilities:**
- Statistics modal management
- Progress display and export
- Weak areas analysis
- Functions: `showStatsModal()`, `updateStatsDisplay()`, `handleExportProgress()`

#### `modules/revision-module.js`
**Responsibilities:**
- Revision mode management
- Weak card identification
- Revision session setup
- Functions: `showRevisionModal()`, `loadRevisionCards()`, `startRevisionSession()`

#### `modules/api-client.js`
**Responsibilities:**
- API communication (similar to admin)
- Question loading
- Error handling
- Functions: `loadQuestions()`, `loadCustomQuestions()`

#### `modules/session-manager.js`
**Responsibilities:**
- Session completion handling
- Session repeat/similar/new functionality
- Integration with session-setup
- Functions: `repeatSameQuestions()`, `startSimilarSession()`, `startNewSession()`

### 2. HTML Templates to Extract:

#### Templates to Add to index.html:
```html
<!-- Card Content Template -->
<template id="card-content-template">
    <div class="card-header">
        <div class="card-indicator"></div>
        <div class="tags-container"></div>
    </div>
    <div class="card-body"></div>
    <div class="card-source">
        <span class="source-label">Source:</span> 
        <span class="source-text"></span>
    </div>
</template>

<!-- Tag Template -->
<template id="tag-template">
    <span class="tag"></span>
</template>

<!-- Source Link Template -->
<template id="source-link-template">
    <a href="" target="_blank" rel="noopener noreferrer" class="source-link"></a>
</template>

<!-- Revision Card Item Template -->
<template id="revision-card-item-template">
    <div class="revision-card-item">
        <input type="checkbox" class="revision-card-checkbox" checked>
        <div class="revision-card-info">
            <div class="revision-card-preview"></div>
            <div class="revision-card-stats">
                <span class="revision-card-accuracy"></span>
                <span class="revision-attempts"></span>
                <span class="revision-tags"></span>
            </div>
        </div>
    </div>
</template>

<!-- Session Item Template -->
<template id="session-item-template">
    <div class="session-item">
        <div>
            <div class="session-date"></div>
            <div class="session-stats">
                <span class="session-cards"></span>
                <span class="session-duration"></span>
            </div>
        </div>
        <div class="session-accuracy"></div>
    </div>
</template>

<!-- Weak Area Item Template -->
<template id="weak-area-item-template">
    <div class="weak-area-item">
        <div class="weak-area-question"></div>
        <div class="weak-area-stats">
            <span class="weak-area-accuracy"></span>
            <span class="weak-area-attempts"></span>
        </div>
    </div>
</template>
```

## Migration Steps

### Phase 1: Setup Module Infrastructure
1. Create `public/js/modules/` directory
2. Update `index.html` to include HTML templates
3. Create base module structure files

### Phase 2: Extract Core Modules
1. Create `ui-helpers.js` with theme and utility functions
2. Create `api-client.js` for API communication
3. Create `flashcard-module.js` for core flashcard functionality

### Phase 3: Extract Feature Modules  
1. Create `filter-module.js` for tag filtering
2. Create `stats-module.js` for statistics
3. Create `revision-module.js` for revision functionality
4. Create `session-manager.js` for session management

### Phase 4: Update Main Script
1. Refactor `scripts.js` to become orchestrator (like admin.js)
2. Import and initialize all modules
3. Handle inter-module communication

### Phase 5: Update HTML Structure
1. Add all necessary HTML templates
2. Update module loading order in HTML
3. Ensure proper initialization sequence

## Module Communication Pattern

Following admin pattern:
- Each module exports public API via IIFE
- Main orchestrator (`scripts.js`) coordinates modules
- Shared state managed through global objects where needed
- Event-driven communication for loose coupling

## File Structure After Migration:

```
public/
├── js/
│   ├── modules/
│   │   ├── api-client.js
│   │   ├── flashcard-module.js  
│   │   ├── ui-helpers.js
│   │   ├── filter-module.js
│   │   ├── stats-module.js
│   │   ├── revision-module.js
│   │   └── session-manager.js
│   ├── scripts.js (orchestrator)
│   ├── session-setup.js (existing)
│   └── progress.js (existing)
├── index.html (with templates)
└── css/
    └── styles.css
```

## Benefits of This Migration:

1. **Better Code Organization** - Each module has single responsibility
2. **Easier Maintenance** - Isolated functionality easier to debug/modify  
3. **Reusability** - Modules can be reused across different pages
4. **Template Consistency** - HTML templates ensure consistent rendering
5. **Following Established Pattern** - Matches admin directory structure
6. **Improved Testing** - Modules can be tested in isolation