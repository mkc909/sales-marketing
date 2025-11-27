# GitHub Worktrees Development System

This directory contains the GitHub worktrees setup and management system for parallel development streams in the sales and marketing repository.

## Worktrees Overview

GitHub worktrees enable:

- Parallel development on multiple branches
- Context switching without losing work
- Isolated development environments
- Efficient branch management
- Simplified collaboration workflows

## Worktree Structure

```
worktrees/
├── README.md              # This file
├── scripts/               # Management scripts
│   ├── setup-worktrees.sh    # Initial setup script
│   ├── create-worktree.sh    # Create new worktree
│   ├── cleanup-worktrees.sh  # Cleanup utility
│   └── sync-worktrees.sh     # Synchronization script
├── config/               # Configuration files
│   ├── worktree-config.json  # Worktree definitions
│   └── branch-structure.json # Branch structure rules
└── docs/                 # Additional documentation
    ├── best-practices.md     # Worktree best practices
    └── troubleshooting.md    # Common issues and solutions
```

## Standard Worktree Configuration

### Primary Worktrees

#### **main** (Production)
- **Purpose**: Stable, production-ready code
- **Usage**: Production deployments, hotfixes
- **Protection**: Protected branch, PR required
- **Sync Frequency**: Daily with production

#### **develop** (Integration)
- **Purpose**: Integration branch for features
- **Usage**: Feature integration, testing
- **Protection**: Protected branch, PR required
- **Sync Frequency**: Continuous from feature branches

### Feature Worktrees

#### **feature/*** (New Features)
- **Purpose**: Individual feature development
- **Usage**: New functionality, enhancements
- **Protection**: Developer-controlled
- **Lifecycle**: Temporary, merged to develop

#### **campaign/*** (Campaign Work)
- **Purpose**: Campaign-specific development
- **Usage**: Campaign landing pages, content
- **Protection**: Team-controlled
- **Lifecycle**: Campaign duration

### Support Worktrees

#### **hotfix/*** (Emergency Fixes)
- **Purpose**: Production emergency fixes
- **Usage**: Critical bug fixes, security patches
- **Protection**: Protected branch, immediate merge
- **Lifecycle**: Emergency, merged to main and develop

#### **release/*** (Release Preparation)
- **Purpose**: Release preparation and testing
- **Usage**: Release candidates, final testing
- **Protection**: Protected branch, QA approval
- **Lifecycle**: Release cycle

## Setup Instructions

### Prerequisites
- Git 2.25+ (worktrees support)
- Bash shell (for scripts)
- Appropriate repository permissions

### Initial Setup

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url> sales-marketing-main
   cd sales-marketing-main
   ```

2. **Run the setup script**:
   ```bash
   ./worktrees/scripts/setup-worktrees.sh
   ```

3. **Verify worktree creation**:
   ```bash
   git worktree list
   ```

### Manual Worktree Creation

Create a new worktree for a feature:
```bash
git worktree add -b feature/new-feature ../sales-marketing-new-feature
cd ../sales-marketing-new-feature
```

Create a worktree for existing branch:
```bash
git worktree add ../sales-marketing-develop develop
cd ../sales-marketing-develop
```

## Daily Workflow

### Starting Work
1. **Navigate to appropriate worktree**:
   ```bash
   cd ../sales-marketing-your-feature
   ```

2. **Update from remote**:
   ```bash
   git fetch origin
   git pull origin your-branch-name
   ```

3. **Start development**:
   ```bash
   # Make your changes
   git add .
   git commit -m "TICKET-123: Implement new feature"
   git push origin your-branch-name
   ```

### Switching Context
1. **List all worktrees**:
   ```bash
   git worktree list
   ```

2. **Navigate to different worktree**:
   ```bash
   cd ../sales-marketing-develop
   ```

3. **Clean up current work**:
   ```bash
   git stash save "Work in progress"
   ```

### Completing Work
1. **Finalize changes**:
   ```bash
   git add .
   git commit -m "TICKET-123: Complete feature implementation"
   git push origin your-branch-name
   ```

2. **Create pull request** (through GitHub UI)

3. **Clean up worktree** (after merge):
   ```bash
   cd ../sales-marketing-main
   git worktree remove ../sales-marketing-your-feature
   git branch -d your-branch-name
   ```

## Management Scripts

### setup-worktrees.sh
Creates the standard worktree structure:
```bash
./worktrees/scripts/setup-worktrees.sh
```

### create-worktree.sh
Creates a new worktree with proper naming:
```bash
./worktrees/scripts/create-worktree.sh feature/new-feature
```

### cleanup-worktrees.sh
Removes old or merged worktrees:
```bash
./worktrees/scripts/cleanup-worktrees.sh
```

### sync-worktrees.sh
Synchronizes all worktrees with remote:
```bash
./worktrees/scripts/sync-worktrees.sh
```

## Best Practices

### Worktree Management
- **Clean up regularly**: Remove completed worktrees
- **Consistent naming**: Follow naming conventions
- **Regular updates**: Keep worktrees synchronized
- **Documentation**: Update relevant documentation

### Branch Protection
- **Main branch**: Require PRs and approvals
- **Develop branch**: Require PRs and testing
- **Feature branches**: Developer discretion
- **Hotfix branches**: Emergency procedures

### Collaboration
- **Clear communication**: Coordinate worktree usage
- **Conflict resolution**: Address merge conflicts promptly
- **Code reviews**: Maintain quality standards
- **Documentation**: Keep documentation current

## Troubleshooting

### Common Issues

#### Worktree Already Exists
```bash
Error: 'path/to/worktree' already exists
```
**Solution**: Remove existing directory or use different path

#### Detached HEAD State
```bash
Warning: You are in a detached HEAD state
```
**Solution**: Checkout appropriate branch:
```bash
git checkout branch-name
```

#### Merge Conflicts
**Solution**: Resolve conflicts in appropriate worktree:
```bash
git status
# Resolve conflicts
git add .
git commit -m "Resolve merge conflicts"
```

### Recovery Procedures

#### Corrupted Worktree
1. Remove corrupted worktree:
   ```bash
   git worktree remove path/to/worktree
   ```

2. Recreate worktree:
   ```bash
   git worktree add path/to/worktree branch-name
   ```

#### Lost Changes
1. Check reflog for lost commits:
   ```bash
   git reflog
   ```

2. Recover lost commits:
   ```bash
   git checkout COMMIT-HASH
   git checkout -b recovery-branch
   ```

## Integration with Tools

### IDE Integration
- **VS Code**: Multi-root workspace configuration
- **IntelliJ**: Multiple project windows
- **Vim/Emacs**: Buffer management

### CI/CD Integration
- **GitHub Actions**: Worktree-aware workflows
- **Jenkins**: Multi-branch pipelines
- **GitLab CI**: Parallel job execution

### Monitoring
- **Worktree status**: Regular health checks
- **Disk usage**: Monitor worktree storage
- **Sync status**: Automated synchronization checks

## Performance Optimization

### Storage Management
- **Shared objects**: Efficient disk usage
- **Regular cleanup**: Remove unused worktrees
- **Compression**: Compress old worktrees if needed

### Network Optimization
- **Selective fetch**: Fetch only needed branches
- **Shallow clones**: For large repositories
- **Local caching**: Optimize remote operations

## Security Considerations

### Access Control
- **Repository permissions**: Appropriate access levels
- **Branch protection**: Critical branch safeguards
- **Worktree isolation**: Prevent cross-contamination

### Data Protection
- **Sensitive data**: Avoid committing secrets
- **Worktree cleanup**: Remove sensitive worktrees
- **Audit trails**: Maintain change history

## Related Documentation

- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [Project Management Guidelines](../docs/guidelines/project-management.md)
- [Ticket Management System](../.tickets/README.md)

---

**Last Updated**: 2025-11-27
**System Owner**: DevOps Team
**Review Schedule**: Quarterly
**Version**: 1.0.0