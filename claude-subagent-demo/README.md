# Claude Code Subagents Demo

This project demonstrates how to use Claude Code's subagent capabilities for verification, validation, and exploration in a Python project.

## Setup

1. Ensure you have Python 3.8+ installed
2. Activate the virtual environment:
   ```
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies (already done by the setup script):
   ```
   pip install pytest flake8
   ```

## Running Tests

```
pytest tests/
```

## Using Claude Code

Start Claude Code from the project root:

```
claude
```

## Recommended Interactions

Try the following interactions with Claude Code:

1. First, have Claude run the tests to confirm they fail:
   ```
   Please run the tests and confirm they fail. Don't implement any code yet.
   ```

2. Then ask Claude to implement the solution with subagent verification:
   ```
   Create an implementation in src/calculator.py that passes all the tests. When you're done, please use independent subagents to verify the implementation isn't overfitting to the tests and check for edge cases that might not be covered by the tests.
   ```

3. When Claude finishes implementation and verification, ask it to improve the code:
   ```
   Based on the subagent verification, please improve the implementation to address any potential issues identified.
   ```

4. Run the tests to confirm the implementation passes:
   ```
   Please run the tests to verify all tests are passing with the improved implementation.
   ```
