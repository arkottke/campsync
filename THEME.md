# CampSync Color Theme

A simple 3-color theme optimized for outdoor camping vibes with great contrast and readability.

## Color Palette

### 🌲 Primary: Forest Green (`camp-*`)
The main brand color for buttons, links, and primary actions.

```
camp-500: #22c55e  (Primary green - use for main buttons, links)
camp-600: #16a34a  (Darker green - use for hover states)
camp-700: #15803d  (Forest green - use for active/pressed states)
```

**Usage:**
- Primary buttons: `btn-camp-500`
- Navigation active states
- Progress indicators
- Success states

### 🔥 Accent: Warm Orange (`accent-*`)
High-contrast accent color for alerts, calls-to-action, and important elements.

```
accent-500: #f97316  (Bright orange - use for accent/CTAs)
accent-600: #ea580c  (Darker orange - use for hover states)
accent-700: #c2410c  (Deep orange - use for active states)
```

**Usage:**
- Secondary buttons
- Alerts and warnings
- Important badges
- Emphasis elements
- Call-to-action items

### ⚪ Neutral: Gray (Tailwind default)
Use Tailwind's standard grays for backgrounds, borders, and text.

```
gray-50:   #f9fafb   (Off-white backgrounds)
gray-100:  #f3f4f6   (Light backgrounds)
gray-500:  #6b7280   (Secondary text)
gray-700:  #374151   (Primary text)
gray-900:  #111827   (Dark text)
```

**Usage:**
- Page backgrounds: `bg-white` or `bg-gray-50`
- Text: `text-gray-700` (default), `text-gray-500` (secondary)
- Borders: `border-gray-200`
- Dividers: `bg-gray-100`

## Component Examples

### Buttons

**Primary Action** (Green)
```tsx
<button className="bg-camp-500 hover:bg-camp-600 active:bg-camp-700 text-white px-4 py-2 rounded-lg">
  Primary Action
</button>
```

**Secondary Action** (Orange)
```tsx
<button className="bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white px-4 py-2 rounded-lg">
  Secondary Action
</button>
```

**Outline Button** (Green border)
```tsx
<button className="border-2 border-camp-500 text-camp-600 hover:bg-camp-50 px-4 py-2 rounded-lg">
  Outline Button
</button>
```

### Cards

```tsx
<div className="bg-white border border-gray-200 rounded-lg shadow-sm">
  <div className="p-4">
    <h3 className="text-lg font-semibold text-gray-900">Card Title</h3>
    <p className="text-gray-500 mt-2">Card content goes here</p>
  </div>
</div>
```

### Navigation

```tsx
<nav className="bg-white border-b border-gray-200">
  <button className="text-camp-600 font-semibold border-b-2 border-camp-500">
    Active Tab
  </button>
  <button className="text-gray-500 hover:text-gray-700">
    Inactive Tab
  </button>
</nav>
```

### Status Badges

**Success** (Green)
```tsx
<span className="bg-camp-100 text-camp-800 px-3 py-1 rounded-full text-sm font-medium">
  ✓ Packed
</span>
```

**Warning** (Orange)
```tsx
<span className="bg-accent-100 text-accent-800 px-3 py-1 rounded-full text-sm font-medium">
  ⚠ Review
</span>
```

### Form Elements

```tsx
<input
  type="text"
  className="border border-gray-300 focus:border-camp-500 focus:ring-2 focus:ring-camp-100 rounded-lg px-4 py-2"
  placeholder="Enter text..."
/>
```

## Dark Mode (Future Enhancement)

When implementing dark mode, use:
- Background: `gray-900` or `gray-800`
- Primary text: `gray-50` or `gray-100`
- Borders: `gray-700`
- Colors remain the same (camp-500, accent-500) but appear lighter on dark backgrounds

## Accessibility

- ✅ Green-Orange contrast passes WCAG AA
- ✅ Text on green backgrounds: Use white text
- ✅ Text on orange backgrounds: Use white text
- ✅ Never use color alone to convey meaning—use icons, text, or patterns

## Camping Theme Rationale

- **Forest Green**: Natural, calming, outdoor connection
- **Warm Orange**: Campfire, tent, outdoor equipment aesthetic
- **Gray neutrals**: Clean, modern, readability
- **Together**: Cohesive outdoor camping brand identity

## Usage in Code

```tsx
// ✅ GOOD: Use semantic color names
<button className="bg-camp-500 hover:bg-camp-600">...</button>
<div className="bg-accent-500">...</div>

// ✅ GOOD: Use gray for neutral elements
<div className="bg-gray-100 text-gray-700">...</div>

// ❌ AVOID: Don't mix multiple color palettes
<button className="bg-blue-500">...</button>  // Don't use blue

// ❌ AVOID: Don't hardcode hex colors
<div style={{ backgroundColor: '#22c55e' }}>...</div>
```

## Quick Reference: Color Classes

| Element | Class | Hex |
|---------|-------|-----|
| **Primary Button** | `bg-camp-500` | #22c55e |
| **Primary Hover** | `bg-camp-600` | #16a34a |
| **Secondary Button** | `bg-accent-500` | #f97316 |
| **Secondary Hover** | `bg-accent-600` | #ea580c |
| **Text Primary** | `text-gray-900` | #111827 |
| **Text Secondary** | `text-gray-500` | #6b7280 |
| **Border Light** | `border-gray-200` | #e5e7eb |
| **Background** | `bg-gray-50` | #f9fafb |

---

**Created**: April 6, 2026
**Theme Version**: 1.0
**Tailwind Config**: ✅ `tailwind.config.js` updated
