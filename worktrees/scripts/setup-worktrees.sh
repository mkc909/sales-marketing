#!/bin/bash

# GitHub Worktrees Setup Script for Sales & Marketing Repository
# This script creates the standard worktree structure for parallel development

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKTREES_DIR="$REPO_ROOT/../sales-marketing-worktrees"

# Standard branches to create worktrees for
BRANCHES=(
    "main"
    "develop"
)

echo -e "${BLUE}🚀 Setting up GitHub Worktrees for Sales & Marketing Repository${NC}"
echo -e "${BLUE}================================================================${NC}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Check if git worktrees is supported
if ! git worktree --version > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Git worktrees not supported. Please upgrade to Git 2.25+${NC}"
    exit 1
fi

# Create worktrees directory
echo -e "${YELLOW}📁 Creating worktrees directory...${NC}"
mkdir -p "$WORKTREES_DIR"

# Fetch latest changes from remote
echo -e "${YELLOW}📥 Fetching latest changes from remote...${NC}"
git fetch origin

# Create worktrees for standard branches
for branch in "${BRANCHES[@]}"; do
    echo -e "${YELLOW}🌳 Creating worktree for branch: $branch${NC}"
    
    # Check if branch exists remotely
    if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
        # Branch exists remotely, create worktree
        if git worktree add "$WORKTREES_DIR/$branch" "origin/$branch" 2>/dev/null; then
            echo -e "${GREEN}✅ Worktree created for $branch${NC}"
        else
            echo -e "${YELLOW}⚠️  Worktree for $branch may already exist${NC}"
        fi
    else
        # Branch doesn't exist remotely, create it first
        echo -e "${YELLOW}📝 Creating branch $branch...${NC}"
        if [ "$branch" = "main" ]; then
            # Main branch should already exist, but if not, create from current branch
            git checkout -b "$branch"
            git push -u origin "$branch"
            git worktree add "$WORKTREES_DIR/$branch" "$branch"
        else
            # Create other branches from main
            git checkout main
            git pull origin main
            git checkout -b "$branch"
            git push -u origin "$branch"
            git checkout main
            git worktree add "$WORKTREES_DIR/$branch" "$branch"
        fi
        echo -e "${GREEN}✅ Branch and worktree created for $branch${NC}"
    fi
done

# Set up initial branch structure
echo -e "${YELLOW}🔧 Setting up initial branch structure...${NC}"
cd "$WORKTREES_DIR/develop"

# Create basic branch protection rules file
cat > "$REPO_ROOT/worktrees/config/branch-protection.json" << EOF
{
  "branch_protection": {
    "main": {
      "required_status_checks": true,
      "enforce_admins": true,
      "required_pull_request_reviews": {
        "required_approving_review_count": 2
      },
      "restrictions": null
    },
    "develop": {
      "required_status_checks": true,
      "enforce_admins": false,
      "required_pull_request_reviews": {
        "required_approving_review_count": 1
      },
      "restrictions": null
    }
  }
}
EOF

# Create worktree configuration file
cat > "$REPO_ROOT/worktrees/config/worktree-config.json" << EOF
{
  "worktrees": {
    "main": {
      "purpose": "Production-ready code",
      "protection": "protected",
      "sync_frequency": "daily",
      "merge_strategy": "merge_commit"
    },
    "develop": {
      "purpose": "Integration branch for features",
      "protection": "protected",
      "sync_frequency": "continuous",
      "merge_strategy": "squash_merge"
    }
  },
  "feature_branch_pattern": "feature/*",
  "campaign_branch_pattern": "campaign/*",
  "hotfix_branch_pattern": "hotfix/*",
  "release_branch_pattern": "release/*"
}
EOF

# Create a sample feature worktree
echo -e "${YELLOW}🎯 Creating sample feature worktree...${NC}"
cd "$REPO_ROOT"
git checkout develop
git pull origin develop

if git worktree add "$WORKTREES_DIR/feature/sample-feature" -b "feature/sample-feature" 2>/dev/null; then
    echo -e "${GREEN}✅ Sample feature worktree created${NC}"
    
    # Add a sample README to the feature worktree
    cat > "$WORKTREES_DIR/feature/sample-feature/README.md" << EOF
# Sample Feature Worktree

This is a sample feature worktree for demonstration purposes.

## Purpose
This worktree demonstrates how feature branches should be structured and used.

## Usage
1. Make your changes in this worktree
2. Commit your changes with descriptive messages
3. Push to the remote branch
4. Create a pull request to develop
5. After merge, clean up this worktree

## Cleanup
When the feature is complete and merged:
\`\`\`bash
cd ../sales-marketing-main
git worktree remove ../sales-marketing-worktrees/feature/sample-feature
git branch -d feature/sample-feature
\`\`\`

---
Created: $(date)
EOF

    cd "$WORKTREES_DIR/feature/sample-feature"
    git add README.md
    git commit -m "feat: Add sample feature worktree documentation"
    git push -u origin feature/sample-feature
    cd "$REPO_ROOT"
else
    echo -e "${YELLOW}⚠️  Sample feature worktree may already exist${NC}"
fi

# Create utility scripts
echo -e "${YELLOW}📜 Creating utility scripts...${NC}"

# Create worktree management script
cat > "$REPO_ROOT/worktrees/scripts/manage-worktrees.sh" << 'EOF'
#!/bin/bash

# Worktree Management Utility Script

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKTREES_DIR="$REPO_ROOT/../sales-marketing-worktrees"

case "$1" in
    "list")
        echo "Available worktrees:"
        git worktree list
        ;;
    "sync")
        echo "Syncing all worktrees..."
        git worktree list | while read line; do
            path=$(echo $line | awk '{print $1}')
            if [ -d "$path" ]; then
                echo "Syncing $path..."
                cd "$path"
                git fetch origin
                git pull
                cd "$REPO_ROOT"
            fi
        done
        ;;
    "cleanup")
        echo "Cleaning up merged branches..."
        git branch --merged | grep -v "main\|develop" | while read branch; do
            if [ ! -z "$branch" ]; then
                echo "Removing merged branch: $branch"
                git branch -d "$branch" 2>/dev/null || true
            fi
        done
        ;;
    "status")
        echo "Worktree status:"
        git worktree list
        echo ""
        echo "Branch status:"
        git branch -a
        ;;
    *)
        echo "Usage: $0 {list|sync|cleanup|status}"
        echo "  list    - List all worktrees"
        echo "  sync    - Sync all worktrees with remote"
        echo "  cleanup - Clean up merged branches"
        echo "  status  - Show worktree and branch status"
        exit 1
        ;;
esac
EOF

chmod +x "$REPO_ROOT/worktrees/scripts/manage-worktrees.sh"

# Create worktree creation script
cat > "$REPO_ROOT/worktrees/scripts/create-worktree.sh" << 'EOF'
#!/bin/bash

# Create New Worktree Script

if [ $# -eq 0 ]; then
    echo "Usage: $0 <branch-name> [base-branch]"
    echo "Example: $0 feature/new-feature develop"
    exit 1
fi

BRANCH_NAME="$1"
BASE_BRANCH="${2:-develop}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKTREES_DIR="$REPO_ROOT/../sales-marketing-worktrees"

echo "Creating worktree for branch: $BRANCH_NAME (based on $BASE_BRANCH)"

cd "$REPO_ROOT"
git fetch origin
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH"

if git worktree add "$WORKTREES_DIR/$BRANCH_NAME" -b "$BRANCH_NAME"; then
    echo "✅ Worktree created successfully: $WORKTREES_DIR/$BRANCH_NAME"
    echo "📝 Don't forget to:"
    echo "   1. cd $WORKTREES_DIR/$BRANCH_NAME"
    echo "   2. Start working on your feature"
    echo "   3. Push your changes: git push -u origin $BRANCH_NAME"
    echo "   4. Create a pull request when ready"
else
    echo "❌ Failed to create worktree"
    exit 1
fi
EOF

chmod +x "$REPO_ROOT/worktrees/scripts/create-worktree.sh"

# Return to main branch
cd "$REPO_ROOT"
git checkout main

# Display summary
echo -e "${GREEN}✅ Worktrees setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "   Worktrees directory: $WORKTREES_DIR"
echo -e "   Created worktrees: ${BRANCHES[*]}"
echo -e "   Sample feature worktree: feature/sample-feature"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo -e "   1. List worktrees: git worktree list"
echo -e "   2. Navigate to worktree: cd $WORKTREES_DIR/develop"
echo -e "   3. Use management script: ./worktrees/scripts/manage-worktrees.sh"
echo -e "   4. Create new worktree: ./worktrees/scripts/create-worktree.sh feature/new-feature"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "   Read worktrees/README.md for detailed usage instructions"
echo ""
echo -e "${GREEN}🎉 Happy coding with worktrees!${NC}"