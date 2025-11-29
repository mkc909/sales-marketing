# 📝 Git Workflow for EstateFlow Deployment

## Quick Reference for Kilo Code

### 🚀 Start Here
```bash
# 1. Navigate to repository root
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing

# 2. Check current status
git status

# 3. Create your working branch
git checkout -b deploy/kilo-code-estateflow-deployment

# 4. Verify you're on the right branch
git branch
```

### 📌 Commit Points

#### After Initial Setup
```bash
git add package-lock.json
git commit -m "chore: update dependencies for deployment"
```

#### After Configuration
```bash
git add worktrees/siteforge/wrangler.toml
git commit -m "config: update Cloudflare IDs for deployment"
```

#### After Successful Deployment
```bash
git add -A
git commit -m "deploy: successful deployment to Cloudflare Workers

- Worker URL: [YOUR_URL]
- Database ID: [YOUR_ID]
- Timestamp: $(date)"
```

#### After Each Test Stage
```bash
# Stage 1 - 10 records
git add test-data-10.csv test-import.sql
git commit -m "test: stage 1 complete - 10 records imported successfully"

# Stage 2 - 100 records
git add test-data-100.csv
git commit -m "test: stage 2 complete - 100 records imported successfully"

# Stage 3 - 1,000 records
git add test-data-1000.csv
git commit -m "test: stage 3 complete - 1,000 records imported successfully"

# Stage 4 - 10,000 records
git add test-data-10000.csv
git commit -m "test: stage 4 complete - 10,000 records imported successfully"
```

#### After Testing Complete
```bash
git add -A
git commit -m "test: all progressive import tests complete

Results:
- Stage 1 (10): PASS
- Stage 2 (100): PASS
- Stage 3 (1k): PASS
- Stage 4 (10k): PASS
- Rollback: PASS

Platform ready for production import"
```

### 📤 Push and Create PR

#### Push Your Branch
```bash
git push origin deploy/kilo-code-estateflow-deployment
```

#### Create Pull Request (GitHub CLI)
```bash
gh pr create \
  --title "Deploy: EstateFlow Platform to Cloudflare Workers" \
  --body "## Summary

Deployed EstateFlow platform and completed progressive testing.

## Results
- Deployment: ✅ Success
- Testing: ✅ All stages passed
- Performance: ✅ < 100ms queries
- Ready for 500k import: ✅ YES

## Details
See full report in deployment ticket."
```

#### Or Create PR Manually
1. Go to GitHub repository
2. Click "Compare & pull request" for your branch
3. Use the template provided in the ticket

### 🔍 Useful Git Commands

```bash
# Check what you're about to commit
git status

# See your commit history
git log --oneline -10

# See what changed in a file
git diff worktrees/siteforge/wrangler.toml

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Show current branch
git branch --show-current

# See all branches
git branch -a
```

### ⚠️ Git Best Practices

1. **Commit Often** - After each major step
2. **Clear Messages** - Explain what and why
3. **Test Before Commit** - Ensure it works
4. **Don't Commit Secrets** - Check for API keys
5. **Review Before Push** - `git status` and `git diff`

### 📊 Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `deploy:` - Deployment related
- `test:` - Testing related
- `config:` - Configuration changes
- `fix:` - Bug fixes
- `docs:` - Documentation
- `chore:` - Maintenance

**Examples:**
```bash
git commit -m "deploy: initial Cloudflare Workers deployment"
git commit -m "test: complete stage 1 with 10 records"
git commit -m "config: update D1 database ID in wrangler.toml"
git commit -m "fix: correct batch size for import script"
git commit -m "docs: add deployment report and test results"
```

### 🚨 If Something Goes Wrong

#### Accidentally committed wrong file
```bash
# Remove from staging
git reset HEAD <file>

# Or undo last commit
git reset --soft HEAD~1
```

#### Need to switch branches
```bash
# Save current work
git stash

# Switch branches
git checkout main

# Come back and restore
git checkout deploy/kilo-code-estateflow-deployment
git stash pop
```

#### Merge conflicts
```bash
# Update your branch
git fetch origin
git merge origin/main

# Resolve conflicts in files
# Then:
git add <resolved-files>
git commit -m "fix: resolve merge conflicts"
```

### ✅ Final Checklist Before PR

- [ ] All tests passed
- [ ] No sensitive data committed
- [ ] Clear commit messages
- [ ] Branch is up to date
- [ ] PR description complete
- [ ] Deployment report attached

---

**Remember**: Good git practices make review and rollback easier!