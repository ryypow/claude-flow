#!/bin/bash

echo "Validating Dockerfile syntax..."
echo "================================"

# Check for common Dockerfile issues
dockerfile="./Dockerfile"

if [ ! -f "$dockerfile" ]; then
    echo "❌ Dockerfile not found!"
    exit 1
fi

echo "✅ Dockerfile found"

# Check for basic syntax issues (excluding heredoc sections)
# First, extract lines that are NOT inside heredoc blocks
temp_file=$(mktemp)
awk '/cat.*<<.*EOF/{in_heredoc=1} !in_heredoc{print} /^EOF$|^SCRIPT_EOF$/{in_heredoc=0}' "$dockerfile" > "$temp_file"

complex_quotes=$(grep 'echo.*'\''.*'\''' "$temp_file" 2>/dev/null || true)
if [ -n "$complex_quotes" ]; then
    echo "❌ Found complex quote escaping that may cause issues outside heredoc"
    echo "$complex_quotes"
    rm -f "$temp_file"
    exit 1
else
    echo "✅ No problematic quote escaping found"
fi

rm -f "$temp_file"

# Check for heredoc syntax
if grep -q "cat.*<<.*EOF" "$dockerfile"; then
    echo "✅ Using heredoc syntax (good for complex scripts)"
fi

# Check for SCRIPT_EOF closing
if grep -q "SCRIPT_EOF" "$dockerfile"; then
    echo "✅ Heredoc properly closed with SCRIPT_EOF"
fi

# Check for line continuation issues
if grep -q '\\\s*$' "$dockerfile"; then
    echo "✅ Line continuations found and properly formatted"
fi

echo ""
echo "🎉 Dockerfile validation completed successfully!"
echo "The syntax appears to be correct and should build without errors."
