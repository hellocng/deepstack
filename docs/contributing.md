# DeepStack Contributing Guidelines

## Overview

Thank you for your interest in contributing to the Poker Room Management System! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- Supabase account
- Basic knowledge of Next.js, TypeScript, and Supabase

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/poker-room-management.git
   cd poker-room-management
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Database Setup**
   - Create a new Supabase project
   - Run the migration scripts from `docs/database.md`
   - Set up OAuth providers in Supabase dashboard

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature development branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Critical production fixes

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add OAuth login with Google
fix(api): resolve user creation validation error
docs(readme): update installation instructions
test(games): add unit tests for game service
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow the coding standards
   - Write tests for new functionality
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): your commit message"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   Create a pull request with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots for UI changes
   - Testing instructions

## Coding Standards

### TypeScript
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use proper type annotations
- Prefer `interface` over `type` for object shapes

### React Components
- Use functional components with hooks
- Follow the component structure defined in `.cursor/rules/component-patterns.mdc`
- Use proper prop types and interfaces
- Implement error boundaries where appropriate

### File Naming
- Use kebab-case for file names: `user-profile.tsx`
- Use PascalCase for component files: `UserProfile.tsx`
- Use camelCase for utility files: `formatCurrency.ts`

### Database
- Use snake_case for table and column names
- Implement proper RLS policies
- Use Supabase client for all database operations
- Follow the patterns in `.cursor/rules/database-patterns.mdc`

### Styling
- Use Tailwind CSS for styling
- Use shadcn/ui components when available
- Follow mobile-first responsive design
- Maintain consistent spacing and typography

## Testing

### Unit Tests
```typescript
// __tests__/components/UserProfile.test.tsx
import { render, screen } from '@testing-library/react'
import { UserProfile } from '@/components/UserProfile'

describe('UserProfile', () => {
  it('renders user information correctly', () => {
    const mockUser = {
      id: '1',
      display_name: 'John Doe',
      email: 'john@example.com'
    }
    
    render(<UserProfile user={mockUser} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
```

### Integration Tests
```typescript
// __tests__/api/games.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/[tenant]/games/route'

describe('/api/[tenant]/games', () => {
  it('should return games for a tenant', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { tenant: 'royal' }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toHaveProperty('data')
  })
})
```

### E2E Tests
```typescript
// __tests__/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('user can sign in', async ({ page }) => {
  await page.goto('/royal/login')
  
  await page.fill('[data-testid="email"]', 'test@example.com')
  await page.fill('[data-testid="password"]', 'password123')
  await page.click('[data-testid="sign-in-button"]')
  
  await expect(page).toHaveURL('/royal')
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
})
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Code Review Process

### Review Checklist
- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] Proper error handling
- [ ] Security considerations addressed
- [ ] Performance implications considered

### Review Guidelines
- Be constructive and respectful
- Focus on code quality and maintainability
- Ask questions if something is unclear
- Suggest improvements rather than just pointing out problems
- Approve when you're confident the code is ready

## Documentation

### Code Documentation
- Document complex business logic
- Use JSDoc for function documentation
- Keep comments up to date
- Explain non-obvious implementations

### API Documentation
- Update API documentation when adding new endpoints
- Include request/response examples
- Document error codes and messages

### README Updates
- Update README when adding new features
- Include setup instructions for new dependencies
- Keep deployment instructions current

## Issue Reporting

### Bug Reports
When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Screenshots or error messages

### Feature Requests
When requesting features, include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation approach
- Any relevant mockups or examples

## Security

### Security Guidelines
- Never commit sensitive information (API keys, passwords)
- Use environment variables for configuration
- Implement proper input validation
- Follow OWASP security guidelines
- Report security vulnerabilities privately

### Reporting Security Issues
- Email security issues to: security@pokerroom.com
- Do not create public issues for security vulnerabilities
- Include detailed information about the vulnerability
- Allow time for the issue to be addressed before disclosure

## Performance

### Performance Guidelines
- Optimize database queries
- Use proper indexing
- Implement caching where appropriate
- Minimize bundle size
- Use lazy loading for large components

### Performance Testing
```typescript
// Example performance test
import { performance } from 'perf_hooks'

test('API response time', async () => {
  const start = performance.now()
  
  const response = await fetch('/api/royal/games')
  const data = await response.json()
  
  const end = performance.now()
  const duration = end - start
  
  expect(duration).toBeLessThan(1000) // Should respond within 1 second
  expect(data).toBeDefined()
})
```

## Accessibility

### Accessibility Guidelines
- Use semantic HTML elements
- Implement proper ARIA labels
- Ensure keyboard navigation works
- Maintain proper color contrast
- Test with screen readers

### Accessibility Testing
```typescript
// Example accessibility test
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('should not have accessibility violations', async () => {
  const { container } = render(<UserProfile user={mockUser} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Release Process

### Versioning
We use [Semantic Versioning](https://semver.org/):
- `MAJOR`: Breaking changes
- `MINOR`: New features (backward compatible)
- `PATCH`: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version bumped in package.json
- [ ] Changelog updated
- [ ] Release notes prepared
- [ ] Deployment tested

### Creating a Release
```bash
# Update version
npm version patch  # or minor, major

# Push tags
git push origin main --tags

# Create GitHub release
gh release create v1.0.0 --generate-notes
```

## Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different opinions and approaches
- Follow the golden rule: treat others as you want to be treated

### Getting Help
- Check existing documentation first
- Search existing issues and discussions
- Ask questions in GitHub Discussions
- Join our Discord community (link in README)

### Recognition
Contributors will be recognized in:
- README contributors section
- Release notes
- Project documentation
- Community highlights

## Development Tools

### Recommended VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Tailwind CSS IntelliSense
- Supabase
- GitLens
- Prettier
- ESLint

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### Git Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Set up pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Issues
- Verify Supabase credentials
- Check network connectivity
- Ensure RLS policies are correct

#### Authentication Issues
- Verify OAuth redirect URLs
- Check environment variables
- Ensure user has proper permissions

### Getting Help
- Check the troubleshooting section in README
- Search existing GitHub issues
- Ask in GitHub Discussions
- Join our Discord community

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.
