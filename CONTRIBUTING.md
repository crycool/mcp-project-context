# Contributing to MCP Project Context Manager

We welcome contributions to MCP Project Context Manager! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/mcp-project-context.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit with descriptive messages
7. Push to your fork
8. Create a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## Code Standards

### TypeScript
- Use strict mode
- Provide type annotations for all parameters and return values
- Avoid `any` type unless absolutely necessary
- Use interfaces for object shapes

### Code Style
- Use ES modules (import/export)
- Async/await for asynchronous operations
- Meaningful variable and function names
- Document complex logic with comments

### File Organization
- Keep files focused on a single responsibility
- Group related functionality in directories
- Export types/interfaces from their defining modules

## Testing

- Write tests for new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names

## Commit Messages

Follow conventional commit format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code changes that neither fix bugs nor add features
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat: add support for Python project detection

- Detect requirements.txt, setup.py, pyproject.toml
- Identify Python frameworks (Django, Flask, FastAPI)
- Support Poetry and Pipenv package managers
```

## Pull Request Process

1. Update README.md with details of changes if applicable
2. Update CHANGELOG.md following Keep a Changelog format
3. Ensure all tests pass
4. Update documentation for new features
5. Request review from maintainers

## Performance Guidelines

Ensure changes maintain performance targets:
- Project discovery: <2 seconds
- Context loading: <1 second
- Memory operations: <500ms
- File operations: <200ms
- Total memory usage: <200MB

## Security Considerations

- Never expose sensitive information
- Validate and sanitize all inputs
- Use path validation for file operations
- Default to read-only operations
- Filter sensitive files (.env, keys, tokens)

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase
- Suggestions for improvements

Thank you for contributing!
