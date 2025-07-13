# CheckVite - Responsive React Application

A modern, responsive React application for expense tracking with a comprehensive design system.

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env file with your configuration
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## ⚙️ Environment Configuration

The application uses environment variables for configuration. Create a `.env` file in the root directory:

### Required Variables

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
```

### Optional Variables

```env
# App Configuration
VITE_APP_NAME=CheckVite
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

### Environment-Specific Files

- `.env` - Default environment variables (not committed to git)
- `.env.local` - Local overrides (not committed to git)
- `.env.development` - Development environment
- `.env.production` - Production environment

### Using the Configuration

```javascript
import config, { getApiUrl } from './config/index.js';

// Get API base URL
console.log(config.API_BASE_URL); // http://localhost:3000

// Get full API URL for an endpoint
const url = getApiUrl('/api/users'); // http://localhost:3000/api/users

// Check environment
if (config.IS_DEV) {
  console.log('Running in development mode');
}
```

## 🎨 Responsive Design System

This application uses a modern, responsive design system built with CSS custom properties and utility classes.

### Design Tokens

#### Colors
- `--color-primary`: #007acc (Primary blue)
- `--color-primary-hover`: #005fa3 (Primary hover state)
- `--color-secondary`: #4ea8de (Secondary blue)
- `--color-background`: #1e1e1e (Main background)
- `--color-surface`: #2c2c2c (Card/surface background)
- `--color-border`: #444 (Border color)
- `--color-text`: #f5f5f5 (Primary text)
- `--color-text-muted`: rgba(255, 255, 255, 0.7) (Muted text)
- `--color-error`: #ff6b6b (Error color)
- `--color-success`: #51cf66 (Success color)
- `--color-warning`: #ffd43b (Warning color)

#### Typography
- `--font-size-xs`: 0.75rem
- `--font-size-sm`: 0.875rem
- `--font-size-base`: 1rem
- `--font-size-lg`: 1.125rem
- `--font-size-xl`: 1.25rem
- `--font-size-2xl`: 1.5rem
- `--font-size-3xl`: 1.875rem
- `--font-size-4xl`: 2.25rem

#### Spacing
- `--spacing-xs`: 0.25rem
- `--spacing-sm`: 0.5rem
- `--spacing-md`: 1rem
- `--spacing-lg`: 1.5rem
- `--spacing-xl`: 2rem
- `--spacing-2xl`: 3rem

#### Breakpoints
- `--breakpoint-sm`: 640px
- `--breakpoint-md`: 768px
- `--breakpoint-lg`: 1024px
- `--breakpoint-xl`: 1280px

### Utility Classes

#### Layout
- `.container`: Responsive container with max-width
- `.grid`: CSS Grid layout
- `.grid-cols-1` to `.grid-cols-4`: Grid columns
- `.flex`: Flexbox layout
- `.flex-col`: Column direction
- `.flex-wrap`: Wrap flex items
- `.items-center`: Center align items
- `.justify-center`: Center justify content
- `.justify-between`: Space between justify content

#### Spacing
- `.p-sm`, `.p-md`, `.p-lg`: Padding
- `.px-sm`, `.px-md`: Horizontal padding
- `.py-sm`, `.py-md`: Vertical padding
- `.m-sm`, `.m-md`, `.m-lg`: Margin
- `.mx-auto`: Auto horizontal margin
- `.my-sm`, `.my-md`: Vertical margin
- `.gap-sm`, `.gap-md`, `.gap-lg`: Gap between flex/grid items

#### Typography
- `.text-center`, `.text-left`, `.text-right`: Text alignment
- `.font-bold`: Bold font weight
- `.text-sm`, `.text-base`, `.text-lg`, `.text-xl`: Font sizes

#### Components
- `.card`: Card component with shadow and border
- `.modal-overlay`: Modal backdrop
- `.modal-content`: Modal content container
- `.form-group`: Form field group
- `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`: Button variants

### Responsive Features

#### Mobile-First Approach
- All components are designed mobile-first
- Progressive enhancement for larger screens
- Touch-friendly interactions

#### Adaptive Layouts
- Charts adapt to screen size
- Tables become scrollable on mobile
- Modals adjust padding and sizing
- Navigation collapses appropriately

#### Accessibility
- Proper focus management
- Screen reader support
- High contrast mode support
- Reduced motion support
- Touch device optimizations

### Component Guidelines

#### Using the Design System

1. **Always use CSS custom properties** instead of hardcoded values
2. **Use utility classes** for common patterns
3. **Follow mobile-first** responsive design
4. **Test on multiple screen sizes**

#### Example Usage

```jsx
// Good - Using design system
<div className="container">
  <div className="card">
    <h2 className="text-center">Title</h2>
    <div className="flex gap-md">
      <button className="btn-primary">Primary Action</button>
      <button className="btn-secondary">Secondary Action</button>
    </div>
  </div>
</div>

// Bad - Hardcoded values
<div style={{ maxWidth: '1200px', margin: '0 auto' }}>
  <div style={{ background: '#2c2c2c', padding: '20px' }}>
    <h2 style={{ textAlign: 'center' }}>Title</h2>
    <div style={{ display: 'flex', gap: '16px' }}>
      <button style={{ background: '#007acc' }}>Primary Action</button>
      <button style={{ background: '#444' }}>Secondary Action</button>
    </div>
  </div>
</div>
```

## 📱 Testing Responsiveness

- Use browser dev tools to test different screen sizes
- Test on actual mobile devices
- Verify touch interactions work properly
- Check accessibility with screen readers

## 🎯 Key Features

- **Responsive Dashboard**: Charts adapt to screen size
- **Mobile-Friendly Forms**: Touch-optimized inputs and buttons
- **Adaptive Tables**: Horizontal scroll on mobile
- **Flexible Modals**: Proper sizing and positioning
- **Accessible Navigation**: Keyboard and screen reader support
- **Environment Configuration**: Centralized API configuration

## 🔧 Customization

To customize the design system:

1. Modify CSS custom properties in `src/index.css`
2. Add new utility classes as needed
3. Update component styles to use the design system
4. Test across all breakpoints

To customize the API configuration:

1. Set environment variables in `.env` file
2. Modify `src/config/index.js` for additional configuration
3. Use `getApiUrl()` helper for API endpoints
4. Test with different environments

## 📚 Resources

- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
