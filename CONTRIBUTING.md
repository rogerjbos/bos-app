# Contributing to Polkadot UI Template

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/polkadot-ui-template.git
   cd polkadot-ui-template
   ```
3. **Install dependencies**
   ```bash
   pnpm install
   ```
4. **Start development server**
   ```bash
   pnpm dev
   ```

## 📋 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

Follow our [Code Style Guide](#code-style-guide) below.

### 3. Test Your Changes

```bash
# Run linter
pnpm lint

# Build to check for errors
pnpm build

# Test in browser
pnpm dev
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new staking component"
git commit -m "fix: resolve wallet connection issue"
git commit -m "docs: update README with new examples"
```

Commit types:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance

### 5. Push and Create Pull Request

```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub.

## 📐 Code Style Guide

### TypeScript

✅ **DO:**

```typescript
// Use explicit types
interface UserBalance {
  free: string;
  reserved: string;
}

// Use proper naming
const fetchAccountBalance = async (address: string): Promise<UserBalance> => {
  // ...
};

// Document with JSDoc
/**
 * Fetches account balance from the chain
 * @param address - Account address
 * @returns Promise with balance info
 */
export function getBalance(address: string): Promise<UserBalance> {
  // ...
}
```

❌ **DON'T:**

```typescript
// Avoid 'any' type
const data: any = await api.query();

// Don't use var
var count = 0;

// Don't skip types
function doSomething(param) {
  return param;
}
```

### React Components

✅ **DO:**

```typescript
import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  address: string
  onSuccess?: () => void
}

/**
 * Component that displays user balance
 */
export function BalanceDisplay({ address, onSuccess }: Props) {
  // Component logic

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-dark p-6 rounded-xl"
    >
      {/* Component JSX */}
    </motion.div>
  )
}
```

❌ **DON'T:**

```typescript
// Don't use default exports for components
export default function Component() {}

// Don't inline complex logic in JSX
return <div>{data.map(item => item.values.reduce((a,b) => a + b.nested))}</div>

// Don't forget prop types
function Component(props) {}
```

### Styling (Tailwind CSS)

✅ **DO:**

```tsx
// Use design system classes
<div className="glass-dark p-6 rounded-xl border border-white/10">
  <h2 className="text-gradient text-2xl font-bold mb-4">Title</h2>
  <p className="text-white/70">Description</p>
</div>

// Group related utilities
<button className="px-4 py-2 rounded-lg bg-gradient-polkadot text-white hover:opacity-90 transition-opacity">
  Click Me
</button>
```

❌ **DON'T:**

```tsx
// Don't use inline styles
<div style={{ background: 'rgba(255,255,255,0.1)' }}>

// Don't create custom CSS files
// Use Tailwind utilities instead

// Don't use arbitrary values excessively
<div className="p-[13.5px] text-[17.3px]">
```

### File Organization

```
src/
├── components/          # Reusable components
│   ├── ui/             # Base UI components (Button, Card, etc.)
│   ├── polkadot/       # Polkadot-specific components
│   └── [Feature].tsx   # Feature components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── config/             # Configuration files
├── providers/          # Context providers
└── styles/             # Global styles
```

### Naming Conventions

- **Components**: `PascalCase` - `BalanceDisplay.tsx`
- **Hooks**: `camelCase` with 'use' prefix - `useBalance.ts`
- **Utils**: `camelCase` - `formatAddress.ts`
- **Constants**: `UPPER_SNAKE_CASE` - `DEFAULT_CHAIN`
- **Types/Interfaces**: `PascalCase` - `interface ChainConfig`

## 🎨 Component Guidelines

### 1. Component Structure

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePolkadot } from '../providers/PolkadotProvider'

// 2. Types/Interfaces
interface Props {
  address: string
  showDetails?: boolean
}

// 3. Component
export function MyComponent({ address, showDetails = false }: Props) {
  // 4. Hooks
  const { api } = usePolkadot()
  const [data, setData] = useState(null)

  // 5. Effects
  useEffect(() => {
    // Effect logic
  }, [api, address])

  // 6. Event Handlers
  const handleClick = () => {
    // Handler logic
  }

  // 7. Render Logic
  if (!data) return <div>Loading...</div>

  // 8. Return JSX
  return (
    <motion.div>
      {/* JSX */}
    </motion.div>
  )
}
```

### 2. Always Handle Loading & Error States

```typescript
export function DataComponent() {
  const { data, isLoading, error } = useBalance(address)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!data) return <EmptyState />

  return <DisplayData data={data} />
}
```

### 3. Use Composition

```typescript
// ✅ Good: Composable
<Card>
  <CardHeader>
    <CardTitle>Balance</CardTitle>
  </CardHeader>
  <CardContent>
    {balance}
  </CardContent>
</Card>

// ❌ Bad: Monolithic
<Card title="Balance" content={balance} />
```

## 🔧 Custom Hooks Guidelines

### Hook Structure

```typescript
/**
 * Hook description
 * @param param - Parameter description
 * @returns Return value description
 */
export function useCustomHook(param: string) {
  const { api, status } = usePolkadot();

  return useQuery({
    queryKey: ["unique-key", param],
    queryFn: async () => {
      if (!api) throw new Error("API not connected");
      // Fetch logic
    },
    enabled: status === "connected" && !!api && !!param,
    refetchInterval: 10000, // If needed
    staleTime: 5000,
  });
}
```

### Best Practices

1. Always check API connection state
2. Use React Query for data fetching
3. Include proper error handling
4. Add TypeScript types
5. Document with JSDoc
6. Enable only when dependencies are ready

## 📝 Documentation

### JSDoc Comments

````typescript
/**
 * Formats a Polkadot address for display
 *
 * @param address - The full address to format
 * @param prefixLength - Characters to show at start (default: 6)
 * @param suffixLength - Characters to show at end (default: 4)
 * @returns Truncated address string
 *
 * @example
 * ```ts
 * formatAddress('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
 * // Returns: '5Grwva...utQY'
 * ```
 */
export function formatAddress(
  address: string,
  prefixLength = 6,
  suffixLength = 4
): string {
  // Implementation
}
````

### README Updates

When adding new features, update:

- Main README.md with feature description
- Add usage examples
- Update table of contents

## 🧪 Testing (Coming Soon)

We're working on adding a comprehensive test suite. For now:

1. Manually test in browser
2. Test on different screen sizes
3. Test with different wallets
4. Check console for errors
5. Build production version (`pnpm build`)

## 🐛 Reporting Bugs

Create an issue with:

**Title**: Short, descriptive title

**Description**:

- What happened
- What you expected
- Steps to reproduce
- Screenshots (if applicable)
- Environment (OS, browser, wallet)

**Example**:

```
Title: Wallet connection fails on Firefox

Description:
When clicking "Connect Wallet" on Firefox 120, nothing happens.

Expected: Wallet selection dialog should appear

Steps:
1. Open app in Firefox 120
2. Click "Connect Wallet" button
3. No dialog appears

Environment: Firefox 120, macOS 14, Polkadot.js extension 0.44
```

## 💡 Suggesting Features

Create an issue with:

- Feature description
- Use case / problem it solves
- Proposed implementation (if you have ideas)
- Examples from other apps (if applicable)

## ✅ Pull Request Checklist

Before submitting:

- [ ] Code follows style guide
- [ ] TypeScript types are proper (no `any`)
- [ ] Components have loading & error states
- [ ] JSDoc comments added
- [ ] No console errors
- [ ] Tested in browser
- [ ] Tested responsive design
- [ ] Commit messages follow convention
- [ ] PR description explains changes

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/paritytech/polkadot-ui-template/issues)
- **Discussions**: [GitHub Discussions](https://github.com/paritytech/polkadot-ui-template/discussions)
- **Discord**: [Polkadot Discord](https://discord.gg/polkadot)

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Polkadot UI Template! 🎉
