# Contributing to Claude Flow v2 Docker Swarm Deployment

First off, thank you for considering contributing to this project! 🎉

This document provides guidelines and information for contributors to help maintain the quality and consistency of the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Process](#contribution-process)
- [Guidelines](#guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## 🤝 Code of Conduct

This project adheres to a code of conduct. By participating, you're expected to uphold this code:

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Inclusive**: Welcome newcomers and create an inclusive environment
- **Be Collaborative**: Work together towards common goals
- **Be Professional**: Maintain professional communication
- **Be Constructive**: Provide constructive feedback and criticism

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Docker Engine**: v28.0+ with Swarm mode
- **Git**: Latest version
- **Text Editor**: VS Code, Vim, or your preferred editor
- **Basic Knowledge**: Docker, Bash scripting, YAML, Markdown

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug Reports**: Report issues and bugs
- 💡 **Feature Requests**: Suggest new features or improvements
- 📖 **Documentation**: Improve or add documentation
- 🔧 **Code**: Fix bugs or implement features
- 🧪 **Testing**: Add or improve tests
- 🎨 **Design**: UI/UX improvements
- 🌍 **Translations**: Help translate documentation

## 💻 Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/claude-flow-swarm-deployment.git
cd claude-flow-swarm-deployment

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/claude-flow-swarm-deployment.git
```

### 2. Development Environment

```bash
# Initialize Docker Swarm (if not already done)
docker swarm init

# Create development API key secret
echo 'test-api-key' | docker secret create anthropic_api_key -

# Build development image
./swarm-manage.sh build

# Deploy development stack
./swarm-manage.sh deploy
```

### 3. Verify Setup

```bash
# Check service status
./swarm-manage.sh status

# Access development UI
curl http://localhost:4000/api/status
```

## 🔄 Contribution Process

### 1. Create an Issue

Before starting work, create or comment on an issue to:
- Discuss the proposed changes
- Get feedback from maintainers
- Ensure no duplicate work
- Align with project goals

### 2. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Changes

Follow our [coding guidelines](#guidelines) while making changes:

- Write clear, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation as needed

### 4. Test Your Changes

```bash
# Test basic functionality
./swarm-manage.sh deploy
./swarm-manage.sh status

# Run any existing tests
./scripts/utils/test-deployment.sh

# Test WebSocket connectivity
curl -v http://localhost:4000/api/status
```

### 5. Commit and Push

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add WebSocket monitoring dashboard

- Add real-time metrics display
- Implement connection status indicators
- Update documentation"

# Push to your fork
git push origin feature/your-feature-name
```

### 6. Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Fill out the PR template completely
4. Link related issues
5. Request review from maintainers

## 📝 Guidelines

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(docker): add health check configuration
fix(websocket): resolve connection timeout issues
docs(api): update WebSocket protocol documentation
```

### Code Style

#### Shell Scripts
```bash
#!/bin/bash
set -euo pipefail

# Use descriptive variable names
readonly CONTAINER_NAME="claude-flow-container"
readonly DEFAULT_PORT=4000

# Functions should have descriptive names and comments
function deploy_service() {
    local stack_name="${1:-claude-flow}"
    echo "Deploying stack: ${stack_name}"
    # Implementation...
}
```

#### Docker/YAML
```yaml
# Use clear, descriptive labels
services:
  claude-flow-alpha:
    # Add comments for complex configurations
    deploy:
      replicas: 1
      resources:
        # Resource limits for production use
        limits:
          memory: 16G
          cpus: '8.0'
```

#### Documentation
- Use clear, concise language
- Include code examples
- Add screenshots where helpful
- Keep formatting consistent

### File Organization

```
claude-flow-swarm-deployment/
├── README.md                 # Main project overview
├── CONTRIBUTING.md           # This file
├── LICENSE                   # Project license
├── CHANGELOG.md             # Version history
├── docker-stack.yml        # Main stack configuration
├── Dockerfile              # Container definition
├── swarm-manage.sh         # Management script
├── .gitignore              # Git ignore rules
├── docs/                   # Detailed documentation
│   ├── api/                # API documentation
│   ├── architecture/       # System design docs
│   ├── deployment/         # Deployment guides
│   └── troubleshooting/    # Problem solving
├── examples/               # Usage examples
│   ├── basic/              # Simple configurations
│   ├── advanced/           # Complex setups
│   └── production/         # Production examples
└── scripts/                # Utility scripts
    ├── utils/              # General utilities
    └── monitoring/         # Monitoring tools
```

## 🧪 Testing

### Manual Testing Checklist

Before submitting a PR, verify:

- [ ] Build completes successfully
- [ ] Deployment works without errors
- [ ] WebUI is accessible
- [ ] WebSocket connects properly
- [ ] Services scale correctly
- [ ] Logs are clean (no errors)
- [ ] Documentation is accurate

### Automated Tests

```bash
# Run deployment tests
./scripts/utils/test-deployment.sh

# Run WebSocket connectivity tests
./scripts/utils/test-websocket.sh

# Validate Docker configurations
./scripts/utils/validate-config.sh
```

### Performance Testing

```bash
# Test resource usage under load
./scripts/monitoring/performance-test.sh

# Monitor memory and CPU usage
./scripts/monitoring/resource-monitor.sh
```

## 📚 Documentation

### Writing Documentation

- **Be Clear**: Write for your intended audience
- **Be Complete**: Cover all necessary information
- **Be Accurate**: Test all code examples
- **Be Consistent**: Follow existing patterns

### Documentation Types

1. **API Documentation**: Document all endpoints and WebSocket events
2. **User Guides**: Step-by-step instructions for users
3. **Developer Docs**: Technical implementation details
4. **Troubleshooting**: Common problems and solutions

### Documentation Standards

```markdown
# Title (H1)

Brief description of the document.

## Section (H2)

### Subsection (H3)

Code examples:

```bash
# Always include comments in code examples
docker service ls
```

Important notes:

> **Note**: Highlight important information
> **Warning**: Highlight potential issues
```

## 🛠️ Issue Guidelines

### Bug Reports

Use the bug report template and include:

- **Environment**: OS, Docker version, system specs
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Logs**: Relevant log output
- **Screenshots**: If applicable

### Feature Requests

Use the feature request template and include:

- **Problem**: What problem does this solve?
- **Solution**: Proposed solution
- **Alternatives**: Other solutions considered
- **Use Cases**: How would this be used?

## 🎯 Pull Request Guidelines

### PR Checklist

- [ ] Branch is up to date with main
- [ ] Changes are tested
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] PR description is complete
- [ ] Related issues are linked

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other: ___________

## Testing
- [ ] Manual testing completed
- [ ] Automated tests pass
- [ ] Performance impact assessed

## Screenshots/Logs
(If applicable)

## Related Issues
Fixes #123
Related to #456
```

## 🌍 Community

### Getting Help

- **Documentation**: Check [docs/](docs/) first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Community**: Join our community channels

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code review and collaboration

### Maintainer Response Times

- **Bug Reports**: 1-3 business days
- **Feature Requests**: 1 week
- **Pull Requests**: 3-5 business days
- **Security Issues**: 24 hours

## 🏆 Recognition

Contributors are recognized in:

- **Contributors List**: Added to README.md
- **Release Notes**: Mentioned in CHANGELOG.md
- **Special Thanks**: For significant contributions

## 📞 Contact

For questions about contributing:

- Open a GitHub Discussion
- Create an issue with the "question" label
- Reach out to maintainers

---

Thank you for contributing to Claude Flow v2 Docker Swarm Deployment! 🚀
