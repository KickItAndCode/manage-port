# Claude Code Subagent Usage Guide

## 🎯 **What Are Subagents?**

Claude Code subagents are independent instances that can help you with verification, validation, and exploration tasks. They provide fresh perspectives on your code, acting like specialist colleagues reviewing your work from different angles.

## 🚀 **When to Use Subagents**

### **Ideal Use Cases:**
- **Code verification** - "Use a subagent to review this implementation for edge cases"
- **Security analysis** - "Have a subagent audit this code for vulnerabilities" 
- **Test coverage analysis** - "Use a subagent to identify missing test scenarios"
- **Alternative approaches** - "Have a subagent explore different implementation strategies"
- **Documentation review** - "Use a subagent to verify this documentation is complete"
- **Performance analysis** - "Have a subagent identify potential bottlenecks"
- **Architecture review** - "Use a subagent to evaluate design patterns and suggest improvements"

### **Not Ideal For:**
- Simple, straightforward tasks you can do directly
- Tasks requiring real-time interaction or back-and-forth
- Writing the initial implementation (do that yourself first)
- Basic syntax or compilation errors

## 💡 **Best Practices**

### **1. Be Specific in Your Instructions**
```
❌ "Use a subagent to check my code"
✅ "Use a subagent to analyze this authentication system for security vulnerabilities, focusing on session management, input validation, and potential injection attacks"
```

### **2. Use After Implementation**
```
Recommended Workflow:
1. Write your initial code
2. Get it working with basic tests
3. THEN use subagents for verification/improvement
4. Apply improvements based on subagent feedback
5. Optional: Use another subagent to verify improvements
```

### **3. Give Clear Context**
- Specify exact file paths and functions to analyze
- Explain what the code is supposed to do
- Mention any constraints, requirements, or assumptions
- Include relevant background about the project domain

### **4. Ask for Actionable Output**
```
❌ "Tell me if this is good"
✅ "Identify specific security risks with code examples and suggest concrete improvements with implementation details"
```

### **5. Focus on Expertise Areas**
Target subagents for specific domains:
- **Security** - Authentication, authorization, input validation
- **Performance** - Bottlenecks, algorithms, resource usage
- **Testing** - Edge cases, coverage gaps, test scenarios
- **Architecture** - Design patterns, maintainability, scalability

## 🔄 **Common Workflow Patterns**

### **Pattern 1: Security Review**
```
You: "Implement user authentication system"
Claude: [implements code]
You: "Use a subagent to audit this for security vulnerabilities"
Claude: [launches security analysis subagent]
You: "Fix the issues identified by the subagent"
Claude: [applies security improvements]
```

### **Pattern 2: Test Enhancement**
```
You: "Write tests for this feature"
Claude: [writes initial tests]
You: "Use a subagent to identify missing edge cases and test scenarios"
Claude: [launches test analysis subagent]
You: "Add the missing test cases identified"
Claude: [enhances test coverage]
```

### **Pattern 3: Performance Optimization**
```
You: "Implement data processing pipeline"
Claude: [implements solution]
You: "Have a subagent review for performance issues and suggest optimizations"
Claude: [launches performance analysis subagent]
You: "Apply the optimization suggestions"
Claude: [implements performance improvements]
```

### **Pattern 4: Code Quality Review**
```
You: "Review this component for maintainability and design issues"
Claude: [launches code quality subagent]
You: "Refactor based on the recommendations"
Claude: [applies architectural improvements]
```

## 📝 **Effective Subagent Prompts**

### **Security Analysis Template:**
```
"Use a subagent to analyze [file/function] for security vulnerabilities. Focus on:
1. Input validation gaps and injection risks
2. Authentication/authorization flaws
3. Data exposure and privacy concerns
4. Session management issues
5. Error handling that might leak information

Provide specific examples of vulnerable code and detailed remediation steps with code examples."
```

### **Code Quality Review Template:**
```
"Have a subagent review [component] for code quality issues including:
1. Code maintainability and readability problems
2. Design pattern violations or improvements
3. Error handling gaps and edge cases
4. Performance bottlenecks or inefficiencies
5. Documentation and naming clarity

Suggest specific improvements with before/after code examples."
```

### **Test Coverage Analysis Template:**
```
"Use a subagent to analyze the test suite for [feature] and identify:
1. Missing edge cases and boundary conditions
2. Error scenario coverage gaps
3. Integration test opportunities
4. Performance and load testing needs
5. Mock/stub validation requirements

Provide specific test cases to add with example implementations."
```

### **Architecture Review Template:**
```
"Have a subagent evaluate [system/component] architecture for:
1. Design pattern appropriateness
2. Separation of concerns and modularity
3. Scalability and maintainability issues
4. Dependency management and coupling
5. Extension points and flexibility

Suggest architectural improvements with refactoring plans."
```

### **Performance Analysis Template:**
```
"Use a subagent to analyze [code/system] for performance issues:
1. Algorithm complexity and optimization opportunities
2. Memory usage and potential leaks
3. I/O operations and caching strategies
4. Database query efficiency
5. Concurrency and parallelization opportunities

Provide specific optimization recommendations with implementation guidance."
```

## ⚡ **Pro Tips**

### **Parallel Analysis:**
Launch multiple subagent analyses simultaneously:
```
"Use subagents to analyze this codebase from multiple angles:
1. Security vulnerabilities and attack vectors
2. Performance bottlenecks and optimization opportunities  
3. Test coverage gaps and missing scenarios
4. Code quality and architectural improvements

Provide independent analysis from each perspective."
```

### **Iterative Improvement:**
```
Development Cycle:
1. Initial implementation
2. Subagent analysis (identify issues)
3. Apply improvements 
4. Second subagent verification (confirm fixes)
5. Final refinements
6. Optional: Different subagent for fresh perspective
```

### **Specialized Deep Dives:**
```
"Use a subagent specialized in [domain] to deep-dive into [specific aspect]:
- Database performance subagent for query optimization
- Frontend accessibility subagent for UX compliance
- API security subagent for endpoint vulnerabilities
- DevOps subagent for deployment and infrastructure issues"
```

### **Cross-Validation:**
```
"After implementing the solution, use two independent subagents to:
1. Verify the implementation solves the original problem
2. Identify any new issues introduced by the changes

Compare their findings and resolve any conflicts."
```

## 🎪 **Demo Environment Usage**

In your `claude-subagent-demo` directory, try these practical examples:

### **Getting Started:**
```bash
# Activate environment
source venv/bin/activate

# Start Claude Code
claude
```

### **Security Analysis Example:**
```
"Use a subagent to analyze the calculator implementation for security vulnerabilities. Test these potential attack vectors:
1. Code injection through mathematical expressions
2. Resource exhaustion attacks
3. Input validation bypasses
4. Python introspection exploits

Provide specific test cases and remediation recommendations."
```

### **Test Enhancement Example:**
```
"Have a subagent review the test suite and identify missing test scenarios for:
1. Floating point precision edge cases
2. Large number boundary conditions
3. Complex expression parsing
4. Error handling completeness
5. Performance stress testing

Suggest specific test implementations to add."
```

### **Alternative Implementation Example:**
```
"Use a subagent to explore alternative approaches to expression evaluation:
1. Recursive descent parser vs AST parsing
2. Performance trade-offs of different methods
3. Security implications of each approach
4. Maintainability and extensibility considerations

Provide pros/cons analysis with implementation sketches."
```

## 🔬 **Advanced Patterns**

### **Red Team Analysis:**
```
"Act as a security-focused subagent attempting to break this system. Try to:
1. Find ways to bypass input validation
2. Exploit edge cases in error handling
3. Discover unintended functionality
4. Identify information disclosure vulnerabilities

Document your attack methodology and successful exploits."
```

### **Quality Assurance Review:**
```
"Use a QA-focused subagent to evaluate this feature from an end-user perspective:
1. User experience and workflow efficiency
2. Error messages and user guidance quality
3. Performance from user's perspective
4. Accessibility and usability concerns
5. Integration with existing system

Provide user-centered improvement recommendations."
```

### **Maintenance Planning:**
```
"Have a maintenance-focused subagent analyze this codebase for:
1. Technical debt accumulation
2. Future extensibility challenges
3. Documentation and knowledge transfer needs
4. Refactoring opportunities and priorities
5. Long-term sustainability concerns

Create a maintenance roadmap with prioritized recommendations."
```

## 🎯 **Key Takeaways**

1. **Use subagents for independent, thorough analysis** - not basic implementation
2. **Be specific about what you want analyzed** - domain, focus areas, depth
3. **Provide context and constraints** - help subagents understand the bigger picture
4. **Ask for actionable recommendations** - specific improvements with examples
5. **Use iteratively** - implement feedback, then verify with another subagent
6. **Combine perspectives** - security + performance + testing for comprehensive coverage

Subagents are most valuable when you want independent, specialist review of your work - they act like having expert colleagues examine your code from fresh, focused perspectives.

## 📚 **Further Learning**

Practice with the demo environment by:
1. Implementing new features (e.g., scientific calculator functions)
2. Using subagents to analyze your implementations
3. Applying their recommendations
4. Comparing different subagent perspectives on the same code
5. Building increasingly complex scenarios to test subagent capabilities

The more you practice with subagents, the better you'll become at crafting effective analysis prompts and leveraging their specialized insights for better code quality.