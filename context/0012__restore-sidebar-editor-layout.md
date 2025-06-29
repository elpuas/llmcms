# 0012 – Restore Sidebar and Editor Layout

## Summary

Successfully fixed the broken layout issue where only the top navbar was visible and the sidebar/editor were missing. The problem was caused by incorrect Astro slot handling when using React components with `client:load`. Restructured the architecture to use direct slots in the Astro template with custom events for component coordination.

## Problem Diagnosis

### Root Cause
The layout broke because Astro slots don't work properly when generated inside React components mounted with `client:load`. The `LLMCMSApp` component was trying to generate slots dynamically, but Astro expects slots to be direct children of the layout component in the template.

### Symptoms
- ✅ Top navbar visible (rendered by AppShell)
- ❌ Sidebar completely missing
- ❌ Editor completely missing  
- ❌ Only background color showing in main content area

### Technical Issue
```astro
<!-- This doesn't work with Astro slots -->
<AppShell>
  <LLMCMSApp client:load /> <!-- React component trying to generate slots -->
</AppShell>
```

## Solution Architecture

### Before (Broken)
```
index.astro
└── AppShell (Astro)
    └── LLMCMSApp (React client:load)
        ├── <div slot="sidebar"> (❌ Not recognized by Astro)
        └── <div slot="content"> (❌ Not recognized by Astro)
```

### After (Fixed)
```
index.astro
└── AppShell (Astro)
    ├── <div slot="sidebar"> (✅ Direct Astro slot)
    │   └── Sidebar (React client:load)
    └── <div slot="content"> (✅ Direct Astro slot)
        └── MarkdownEditor (React client:load)
```

## Files Modified

### **src/pages/index.astro** *(UPDATED)*
- **Before**: Used single `LLMCMSApp` component with `client:load`
- **After**: Direct slots with separate component imports
- **Key Change**: Moved slots from React component to Astro template

```astro
<AppShell>
  <div slot="sidebar">
    <Sidebar client:load />
  </div>
  
  <div slot="content">
    <h1>LLMCMS Editor</h1>
    <p>Welcome to your local-first content management system...</p>
    
    <div style="height: 600px; margin-top: 1rem;">
      <MarkdownEditor client:load initialSlug="welcome-to-llmcms" />
    </div>
  </div>
</AppShell>
```

### **src/components/Sidebar.jsx** *(UPDATED)*
- **Before**: Required `editorRef` and `onFileSelect` props from parent
- **After**: Self-contained with custom event communication
- **Key Changes**:
  - Removed dependency on `editorRef` prop
  - Added custom event dispatching for component coordination
  - Implemented event-based file loading and saving

### **src/components/MarkdownEditor.jsx** *(UPDATED)*  
- **Before**: Used `forwardRef` and `useImperativeHandle` for parent access
- **After**: Event-driven architecture with custom event listeners
- **Key Changes**:
  - Removed `forwardRef` wrapper
  - Added event listeners for `llmcms:*` events
  - Self-contained component that responds to external events

### **src/components/LLMCMSApp.jsx** *(DELETED)*
- **Reasoning**: No longer needed with direct slot architecture
- **Replaced by**: Direct component mounting in `index.astro`

## Custom Event Communication System

### Event Types Implemented

#### 1. **`llmcms:load-file`**
- **Source**: Sidebar
- **Target**: MarkdownEditor  
- **Purpose**: Load a specific file in the editor
- **Payload**: `{ detail: { slug: string } }`

#### 2. **`llmcms:save-current`**
- **Source**: Sidebar
- **Target**: MarkdownEditor
- **Purpose**: Save current editor content
- **Payload**: None

#### 3. **`llmcms:get-current-content`**
- **Source**: Sidebar (for export)
- **Target**: MarkdownEditor
- **Purpose**: Request current content for export
- **Payload**: None

#### 4. **`llmcms:current-content-response`**
- **Source**: MarkdownEditor
- **Target**: Sidebar
- **Purpose**: Provide current content for export
- **Payload**: `{ detail: { content: string, slug: string } }`

### Event Flow Examples

#### New Document Creation
```javascript
// 1. User clicks "New Document" in Sidebar
// 2. Modal form submitted
// 3. Document created in content/
// 4. Sidebar dispatches load event
const loadEvent = new CustomEvent('llmcms:load-file', {
  detail: { slug: 'new-document-slug' }
})
window.dispatchEvent(loadEvent)

// 5. MarkdownEditor receives event and loads file
```

#### Save Current Document
```javascript
// 1. User clicks "Save Current" in Sidebar
// 2. Sidebar dispatches save event
const saveEvent = new CustomEvent('llmcms:save-current')
window.dispatchEvent(saveEvent)

// 3. MarkdownEditor receives event and saves current content
```

#### Export Site
```javascript
// 1. User clicks "Export Site" in Sidebar
// 2. Sidebar requests current content
const exportEvent = new CustomEvent('llmcms:get-current-content')
window.dispatchEvent(exportEvent)

// 3. MarkdownEditor responds with content
const responseEvent = new CustomEvent('llmcms:current-content-response', {
  detail: { content: markdownWithFrontmatter, slug: currentSlug }
})
window.dispatchEvent(responseEvent)

// 4. Sidebar creates ZIP with content
```

## Component Independence

### Sidebar Component
```javascript
export default function Sidebar() {
  // Self-contained state management
  const [status, setStatus] = useState('')
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false)
  
  // Event-based communication
  const handleFileSelect = (slug) => {
    const loadEvent = new CustomEvent('llmcms:load-file', { detail: { slug } })
    window.dispatchEvent(loadEvent)
  }
  
  // No props required for coordination
}
```

### MarkdownEditor Component  
```javascript
export default function MarkdownEditor({ 
  initialSlug,  // Still accepts initial configuration
  onContentChange,
  onFrontmatterChange 
}) {
  // Event listeners for coordination
  useEffect(() => {
    const handleLoadFile = (event) => {
      if (event.detail?.slug) {
        loadFile(event.detail.slug)
      }
    }
    
    window.addEventListener('llmcms:load-file', handleLoadFile)
    return () => window.removeEventListener('llmcms:load-file', handleLoadFile)
  }, [])
  
  // Self-contained functionality
}
```

## Layout Restoration Verification

### Visual Elements Restored
- ✅ **Top Navbar**: Blue header with "LLMCMS" title and subtitle
- ✅ **Left Sidebar**: 280px width with content files and quick actions
- ✅ **Main Editor**: Full-height Toast UI editor with toolbar
- ✅ **Responsive Design**: Mobile layout with stacked components

### Functional Elements Restored  
- ✅ **File Loading**: Click "Welcome to LLMCMS" loads content
- ✅ **New Document**: Modal form creates and loads new files
- ✅ **Save Current**: Persists editor content to content/ folder
- ✅ **Export Site**: Creates ZIP download with all content
- ✅ **Status Notifications**: Visual feedback for all operations

### CSS Grid Layout Working
```css
.app-main {
  display: grid;
  grid-template-columns: 280px 1fr;  /* Sidebar + Editor */
  gap: 0;
  flex: 1;
}
```

## Performance Impact

### Positive Changes
- **Reduced Complexity**: Eliminated wrapper component overhead
- **Direct Mounting**: Each component mounts independently
- **Event Efficiency**: Custom events are lightweight and fast
- **Bundle Size**: Removed unnecessary coordination layer

### Event System Overhead
- **Minimal Impact**: Custom events are native browser APIs
- **No Memory Leaks**: Proper event listener cleanup in useEffect
- **Scoped Communication**: Events only between specific components

## Browser Compatibility

### Custom Events Support
- ✅ **Chrome/Safari**: Full support for CustomEvent API
- ✅ **Firefox**: Full support for CustomEvent API  
- ✅ **Edge**: Full support for CustomEvent API
- ✅ **Mobile**: Works on all modern mobile browsers

### Astro SSR Compatibility
- ✅ **Server-Side**: No event listeners during SSR
- ✅ **Hydration**: Events registered after client-side mounting
- ✅ **Islands**: Each component hydrates independently

## Development Experience

### Hot Reload Behavior
- ✅ **Sidebar Changes**: Instant reload without editor state loss
- ✅ **Editor Changes**: Independent reload cycle
- ✅ **Layout Changes**: AppShell updates without component remount

### Debugging Capabilities
```javascript
// Easy to debug events in browser console
window.addEventListener('llmcms:load-file', (e) => {
  console.log('Load file event:', e.detail)
})
```

## Future Enhancements

### Event System Improvements
- **Promise-based Events**: Replace setTimeout with proper async/await
- **Event Validation**: Add schema validation for event payloads
- **Error Handling**: Centralized error handling for failed events
- **Event History**: Track event flows for debugging

### Component Communication
- **State Management**: Consider adding Zustand or similar for complex state
- **Event Bus**: Create dedicated event bus class for better organization
- **Type Safety**: Add TypeScript interfaces for event payloads

## Testing Results

- ✅ **HTTP 200**: Application loads successfully
- ✅ **Layout Visible**: All three layout sections render correctly
- ✅ **Sidebar Interactive**: All Quick Actions functional
- ✅ **Editor Functional**: Toast UI editor loads with content
- ✅ **Responsive**: Mobile layout works correctly
- ✅ **Events Working**: Component coordination via custom events
- ✅ **No Console Errors**: Clean browser console on load

## LLMCMS Compliance

### ✅ Local-First Architecture
- **No External Dependencies**: All communication via browser events
- **Content/ Folder**: All files properly managed in content directory
- **Client-Side Processing**: No server-side coordination required

### ✅ CSS Architecture
- **Modern CSS**: Maintains nesting, container queries, responsive design
- **Framework-Free**: Zero CSS framework dependencies
- **Component Scoping**: Proper CSS isolation maintained

### ✅ Hackable Design
- **Clear Separation**: Each component has distinct responsibilities
- **Event-Driven**: Easy to add new components and interactions
- **Transparent**: All communication via observable events

## Reasoning

The layout restoration required fundamental architectural changes because Astro's slot system has specific requirements for how content is structured. The key insight was that slots must be direct children of the layout component in the Astro template, not dynamically generated by React components.

The custom event solution provides several benefits:
1. **Astro Compatibility**: Works perfectly with Astro's island architecture
2. **Component Independence**: Each component can be developed and tested separately  
3. **Loose Coupling**: Components don't need direct references to each other
4. **Extensibility**: Easy to add new components and event types
5. **Debug-Friendly**: Events are observable in browser developer tools

This approach maintains the LLMCMS principles of being local-first, hackable, and transparent while providing a robust foundation for future development.

## AI Prompts Used

No external AI prompts were used. Solution was based on:
- Astro documentation for slot handling and client-side components
- React patterns for event-driven communication between components
- Browser CustomEvent API for cross-component messaging
- LLMCMS architectural principles and constraints 