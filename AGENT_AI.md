# AI Agent Guide - Polkadot UI Template

This guide helps you leverage AI coding assistants (like GitHub Copilot, Claude, ChatGPT, or Cursor) to build your Polkadot application faster and more effectively.

## 🤖 Quick Start with AI

### Initial Setup Prompts

When starting a new feature, use these prompts to get oriented:

```
"Show me the structure of this Polkadot template and explain the main directories"

"What components are available in this template? List them with descriptions"

"Explain how to connect to a different Polkadot network in this template"

"Show me how the wallet connection works in this codebase"
```

## 📋 Common Development Tasks

### 1. Creating a New Component

**Prompt:**
```
Create a new component called [ComponentName] that displays [functionality]. 
It should:
- Use TypeScript with proper types
- Follow the existing design system (Tailwind + Polkadot colors)
- Include Framer Motion animations
- Handle loading and error states
- Have JSDoc documentation

Place it in src/components/[ComponentName].tsx
```

**Example:**
```
Create a new component called TransactionHistory that displays the last 10 transactions for a given address.
It should:
- Use TypeScript with proper types
- Follow the existing design system (Tailwind + Polkadot colors)
- Include Framer Motion animations
- Handle loading and error states
- Have JSDoc documentation

Place it in src/components/TransactionHistory.tsx
```

### 2. Creating a New Page

**Prompt:**
```
Create a new page called [PageName] for [purpose].
It should:
- Use the existing layout with Navigation and Footer
- Include responsive design
- Use Framer Motion for animations
- Connect to Polkadot API using our hooks
- Handle wallet connection requirements

Place it in src/pages/[PageName].tsx and add the route to App.tsx
```

**Example:**
```
Create a new page called Staking that shows staking information for the connected account.
Display: current stake, rewards, validators, and allow nominating.
Use useStakingInfo hook and follow the Dashboard page structure.
```

### 3. Creating Custom Hooks

**Prompt:**
```
Create a custom hook called use[HookName] that fetches [data] from the Polkadot API.
It should:
- Use @tanstack/react-query for caching
- Use our usePolkadot hook for API access
- Return loading, error, and data states
- Include TypeScript types
- Have JSDoc documentation with usage examples
- Follow the pattern in src/hooks/useBalance.ts

Place it in src/hooks/use[HookName].ts
```

**Example:**
```
Create a custom hook called useValidators that fetches the list of validators.
Return validator address, commission, total stake, and identity.
Cache the data for 30 seconds.
```

### 4. Adding Chain Support

**Prompt:**
```
Add support for [ChainName] to src/config/chains.ts.
Include:
- Chain ID: [id]
- Endpoint: [wss://...]
- Token symbol: [SYMBOL]
- Token decimals: [number]
- SS58 format: [number]
- Explorer URL
- Chain color
Follow the existing pattern for other chains.
```

### 5. Styling with Tailwind

**Prompt:**
```
Style this component using Tailwind CSS following the Polkadot design system:
- Use glass-dark for cards
- Use text-gradient for headings
- Use bg-gradient-polkadot for accent elements
- Add hover effects with smooth transitions
- Make it responsive (mobile-first)
- Use spacing from the design system (p-6, gap-4, etc.)
```

## 🎯 Feature-Specific Prompts

### Wallet Integration

```
"Add a wallet connection button that shows all available wallets and their account counts"

"Create a component that displays all accounts from all connected wallets with switch functionality"

"Add logic to persist the selected account in localStorage"
```

### Balance & Tokens

```
"Create a component that displays token balance with formatting and conversion to USD"

"Build a token transfer form with amount input, recipient address, and confirmation"

"Add support for displaying balances across multiple chains"
```

### Transactions

```
"Create a transaction signing flow with progress indicators"

"Build a transaction history component that shows past transfers"

"Add transaction notifications using Framer Motion for toast messages"
```

### Staking

```
"Create a staking dashboard showing current stake, rewards, and validator information"

"Build a nominator selection interface with validator filtering and sorting"

"Add charts for staking rewards over time using a charting library"
```

### Governance

```
"Create a referendum voting interface showing active proposals"

"Build a proposal detail page with voting statistics and timeline"

"Add democracy module integration for viewing and voting on proposals"
```

## 🏗️ Architecture Patterns

### State Management

**Prompt:**
```
"Show me the best practice for managing [state type] in this React + TypeScript app"

"How should I structure data fetching for [feature] using React Query?"

"Create a custom context for [feature] that wraps the Polkadot provider"
```

### Error Handling

**Prompt:**
```
"Add comprehensive error handling to this component with user-friendly error messages"

"Create an error boundary that catches errors and displays a fallback UI"

"Add retry logic for failed API calls in this hook"
```

### Performance

**Prompt:**
```
"Optimize this component for performance using React.memo and useMemo"

"Add pagination to this list component that currently loads all items"

"Implement virtual scrolling for this large list of [items]"
```

## 📚 Learning & Exploration

### Understanding the Codebase

```
"Explain how the Polkadot API connection works in this template"

"What's the difference between useBalance and useBlockNumber hooks?"

"Show me how to add a new route and navigation item"

"Explain the folder structure and where different types of code belong"
```

### Polkadot-Specific

```
"How do I query [specific data] from the Polkadot API?"

"Show me how to subscribe to [event type] in real-time"

"What's the correct way to format addresses for different chains?"

"Explain how to decode extrinsic data from a transaction"
```

### Testing

```
"Create unit tests for the [ComponentName] component using Vitest"

"Add integration tests for the wallet connection flow"

"Mock the Polkadot API for testing purposes"
```

## 🔧 Refactoring & Improvements

```
"Refactor this component to use TypeScript generics for better reusability"

"Extract this repeated code into a custom hook"

"Convert this component to use composition instead of prop drilling"

"Add loading skeletons to improve perceived performance"

"Make this component accessible (ARIA labels, keyboard navigation)"
```

## 💡 Best Practices for AI-Assisted Development

### 1. Be Specific
❌ "Create a component"
✅ "Create a TypeScript component called ValidatorList that displays validators in a responsive grid, with search and filter functionality"

### 2. Reference Existing Code
❌ "Add styling"
✅ "Style this component following the pattern in src/pages/Dashboard.tsx with glass-dark cards and text-gradient headings"

### 3. Include Context
❌ "Fix this error"
✅ "Fix this TypeScript error in useBalance hook. The API returns a Codec type but we're treating it as an object with a data property"

### 4. Request Documentation
Always ask for:
- JSDoc comments
- Usage examples
- Type definitions
- Error handling

### 5. Iterate Incrementally
Build features step-by-step:
1. "Create the basic component structure"
2. "Add data fetching with loading states"
3. "Add error handling"
4. "Add animations and polish"

## 🎨 Design System Prompts

```
"What colors are available in the Polkadot design system?"

"Show me examples of using the glass-dark and text-gradient classes"

"Create a color palette reference card showing all available Polkadot colors"

"What animation patterns are used in this template?"
```

## 🔍 Debugging Prompts

```
"This component is not re-rendering when [state] changes. Why?"

"The Polkadot API connection is failing. Help me debug the issue"

"My transaction isn't being signed. Walk me through the signing flow"

"Why is this hook causing infinite re-renders?"
```

## 📦 Adding Dependencies

```
"I want to add charts to this app. What library should I use and how do I integrate it?"

"Add and configure [library name] to this project following best practices"

"What's the best way to handle dates and times in this Polkadot app?"
```

## 🚀 Deployment & Production

```
"Prepare this app for production deployment to Vercel"

"Add environment variable configuration for production vs development"

"What optimizations should I make before deploying?"

"Create a CI/CD pipeline for this template"
```

## 📖 Documentation Generation

```
"Generate comprehensive documentation for all components in src/components/"

"Create a component API reference with props, types, and examples"

"Add JSDoc comments to all exported functions in src/lib/polkadot.ts"
```

## 🎯 Pro Tips

### Tip 1: Use the Template as Reference
When asking for new features, reference existing code:
```
"Create a StakingPage following the same structure as DashboardPage"
```

### Tip 2: Request Type Safety
Always emphasize TypeScript:
```
"Create this with full TypeScript types, no 'any' types"
```

### Tip 3: Ask for Reusability
```
"Make this component generic so it can be reused for different data types"
```

### Tip 4: Request Tests
```
"Also create unit tests for this component"
```

### Tip 5: Iterate on Generated Code
```
"The previous component you created works, but can you optimize it for performance?"
"Add error boundaries to the component we just created"
```

## 🎓 Example: Building a Complete Feature

Here's a complete workflow for building a "Token Transfer" feature:

### Step 1: Plan
```
Prompt: "I want to build a token transfer feature. What components, hooks, and pages will I need?"
```

### Step 2: Create Hook
```
Prompt: "Create a useTransfer hook that handles token transfers. Include balance checking, 
fee estimation, and transaction signing. Use React Query for state management."
```

### Step 3: Create Form Component
```
Prompt: "Create a TransferForm component with inputs for recipient address and amount. 
Include validation, max amount button, and fee display. Style it with our design system."
```

### Step 4: Create Page
```
Prompt: "Create a Transfer page that uses TransferForm and shows transaction history. 
Add it to the navigation and routing."
```

### Step 5: Add Notifications
```
Prompt: "Add toast notifications for successful transfers and errors using Framer Motion"
```

### Step 6: Polish
```
Prompt: "Add loading states, animation, and accessibility improvements to the Transfer page"
```

## 🔗 Useful Resources to Reference

When working with AI, you can ask it to reference:

- **Polkadot.js API**: "Following Polkadot.js API documentation..."
- **TypeScript**: "Using TypeScript best practices..."
- **React Query**: "Following React Query patterns..."
- **Tailwind**: "Using Tailwind CSS utility classes..."
- **Framer Motion**: "Adding Framer Motion animations..."

## 📋 Template Checklist for New Features

Use this checklist when asking AI to create features:

```
Create [Feature Name]:
☐ TypeScript with proper types (no 'any')
☐ JSDoc documentation with examples
☐ Loading and error states
☐ Responsive design (mobile-first)
☐ Framer Motion animations
☐ Tailwind styling following design system
☐ Error handling with user-friendly messages
☐ Accessibility (ARIA, keyboard navigation)
☐ Unit tests (if applicable)
☐ Integration with existing hooks/providers
```

## 🎉 Getting Started

**Your first prompt should be:**
```
"I want to build [describe your app idea] using this Polkadot template. 
What features should I start with, and what's the recommended order to build them?"
```

Then follow up with specific implementation prompts from this guide!

---

**Remember**: AI assistants work best when you:
1. Are specific and detailed
2. Reference existing code patterns
3. Iterate incrementally
4. Request documentation and types
5. Ask for explanations when needed

Happy building! 🚀
