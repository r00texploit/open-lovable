# Tailwind CSS Expert Skill

## Configuration

### Custom Configuration
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

## Component Patterns

### Container Queries
```html
<!-- Using container queries for responsive components -->
<div class="@container">
  <div class="@lg:grid-cols-3 @md:grid-cols-2 grid-cols-1 grid">
    <!-- Content -->
  </div>
</div>
```

### Aspect Ratio
```html
<div class="aspect-video">
  <img src="..." class="object-cover w-full h-full" />
</div>
```

### Custom Utilities
```css
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .animation-delay-200 {
    animation-delay: 200ms;
  }
  
  .animation-delay-400 {
    animation-delay: 400ms;
  }
}
```

## Common Patterns

### Glassmorphism
```html
<div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
  Content
</div>
```

### Gradient Text
```html
<h1 class="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
  Gradient Heading
</h1>
```

### Focus Ring
```html
<button class="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Click me
</button>
```

### Line Clamp
```html
<p class="line-clamp-3">
  Long text that will be clamped after 3 lines...
</p>
```

## Dark Mode

### Using Class Strategy
```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',
  // ...
};
```

```html
<html class="dark">
  <body class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
    <!-- Content -->
  </body>
</html>
```

## Performance

### Purge Configuration
```typescript
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'bg-red-500',
    'text-3xl',
    // Dynamic classes that can't be detected
  ],
};
```

## Project-Specific: Noeron
- Uses custom color system from colors.json
- Custom text-title-* utilities for typography
- Animation utilities from tailwindcss-animate
- Center-x, center-y, flex-center custom utilities
- Extended sizing from 0-1000px
