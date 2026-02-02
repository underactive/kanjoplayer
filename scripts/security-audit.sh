#!/usr/bin/env bash
set -e

# Find Claude CLI - check common installation paths
CLAUDE_CMD=""
for path in "$HOME/.local/bin/claude" "/usr/local/bin/claude" "$HOME/.claude/local/claude"; do
  if [ -x "$path" ]; then
    CLAUDE_CMD="$path"
    break
  fi
done

# Fallback to PATH lookup
if [ -z "$CLAUDE_CMD" ]; then
  CLAUDE_CMD=$(command -v claude 2>/dev/null || true)
fi

if [ -z "$CLAUDE_CMD" ]; then
  echo "Warning: Claude CLI not found. Skipping security audit."
  echo "Install Claude CLI to enable pre-commit security scanning."
  exit 0
fi

# Get staged changes
DIFF=$(git diff --cached --diff-filter=ACMR)

if [ -z "$DIFF" ]; then
  echo "No staged changes to audit."
  exit 0
fi

echo "Running Claude security audit on staged changes..."

# Create temp file with diff
DIFF_FILE=$(mktemp)
echo "$DIFF" > "$DIFF_FILE"

# Run Claude security audit
RESULT=$("$CLAUDE_CMD" -p "You are a security auditor. Analyze this git diff for security vulnerabilities.

Look for:
- XSS vulnerabilities (innerHTML with user input, unsafe DOM manipulation)
- Injection attacks (eval, Function constructor, SQL injection patterns)
- Sensitive data exposure (hardcoded secrets, API keys, passwords)
- Insecure randomness (Math.random for security purposes)
- Path traversal vulnerabilities
- Prototype pollution
- ReDoS (regex denial of service)
- Insecure dependencies or imports
- CORS misconfigurations
- Authentication/authorization issues

Respond in this exact format:
- If NO security issues found: Start with 'PASS:' followed by a brief confirmation
- If security issues found: Start with 'FAIL:' followed by detailed explanation of each issue, including file, line context, vulnerability type, and remediation

Be thorough but avoid false positives. Only flag genuine security concerns.

Git diff to analyze:
$(cat "$DIFF_FILE")" 2>&1)

rm "$DIFF_FILE"

# Check result
if echo "$RESULT" | grep -q "^PASS:"; then
  echo "✓ Security audit passed"
  echo "$RESULT" | sed 's/^PASS://'
  exit 0
else
  echo ""
  echo "============================================"
  echo "SECURITY AUDIT FAILED"
  echo "============================================"
  echo ""
  echo "$RESULT" | sed 's/^FAIL://'
  echo ""
  echo "============================================"
  echo "Commit blocked. Fix the issues above."
  echo "To bypass: git commit --no-verify"
  echo "============================================"
  exit 1
fi
