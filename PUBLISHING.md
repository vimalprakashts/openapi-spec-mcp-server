# Publishing to npm

This guide will help you publish this package to npm so it can be run via `npx vims-openapi-mcp`.

## Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup if you don't have one
2. **npm CLI**: Make sure npm is installed (`npm --version`)

## Before Publishing

### 1. Update package.json metadata

Edit `package.json` and update these fields:

```json
{
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/openapi-spec-mcp-server.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/openapi-spec-mcp-server/issues"
  },
  "homepage": "https://github.com/yourusername/openapi-spec-mcp-server#readme"
}
```

Replace with your actual:
- Name and email
- GitHub username/organization
- Repository URL

### 2. Update LICENSE

Edit `LICENSE` file and update the copyright year and holder.

### 3. Check package name availability

```bash
npm search vims-openapi-mcp
```

The name `vims-openapi-mcp` should be available. If taken, choose a different one and update `package.json`.

## Publishing Steps

### 1. Login to npm

```bash
npm login
```

Enter your npm credentials.

### 2. Build and test locally

```bash
# Clean any previous builds
npm run clean

# Install dependencies
npm install

# Build the project
npm run build

# Test locally using npm link
npm link

# Test the command works
vims-openapi-mcp --help

# Unlink when done testing
npm unlink -g vims-openapi-mcp
```

### 3. Verify package contents

See what will be published:

```bash
npm pack --dry-run
```

This shows which files will be included. Should see:
- `dist/` directory
- `README.md`
- `LICENSE`
- `package.json`

### 4. Publish to npm

For first-time publishing:

```bash
npm publish
```

For scoped packages (if you want to use @yourname/package-name):

```bash
npm publish --access public
```

### 5. Verify publication

```bash
# Check your package page
npm view vims-openapi-mcp

# Test with npx
npx vims-openapi-mcp --help
```

## Version Updates

When publishing updates:

### 1. Update version

```bash
# For patch updates (1.0.0 -> 1.0.1)
npm version patch

# For minor updates (1.0.0 -> 1.1.0)
npm version minor

# For major updates (1.0.0 -> 2.0.0)
npm version major
```

This automatically:
- Updates package.json version
- Creates a git commit
- Creates a git tag

### 2. Push to GitHub

```bash
git push && git push --tags
```

### 3. Publish to npm

```bash
npm publish
```

## Useful npm Commands

```bash
# View package info
npm view vims-openapi-mcp

# Check for outdated dependencies
npm outdated

# Update dependencies
npm update

# Unpublish a version (only within 72 hours)
npm unpublish vims-openapi-mcp@1.0.0

# Deprecate a version
npm deprecate vims-openapi-mcp@1.0.0 "Please upgrade to 1.0.1"
```

## After Publishing

Users can now install and use your package:

```bash
# Run directly with npx (no installation needed)
npx vims-openapi-mcp --url https://api.example.com/openapi.json

# Or install globally
npm install -g vims-openapi-mcp
vims-openapi-mcp --url https://api.example.com/openapi.json

# Or use in a project
npm install vims-openapi-mcp
```

## Troubleshooting

### "Package name already exists"
- Choose a different name or use a scoped package: `@yourusername/openapi-mcp`

### "You must be logged in to publish"
- Run `npm login` first

### "402 Payment Required"
- You might be trying to publish a scoped package without `--access public`

### Package not working after publish
- Verify the `bin` field in package.json points to correct file
- Ensure dist/index.js has shebang: `#!/usr/bin/env node`
- Check that prepublishOnly script ran successfully
