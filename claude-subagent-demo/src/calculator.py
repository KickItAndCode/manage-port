"""Calculator module providing basic arithmetic operations and expression evaluation."""

import re
from typing import Union


def add(a: Union[int, float], b: Union[int, float]) -> Union[int, float]:
    """Add two numbers.
    
    Args:
        a: First number
        b: Second number
    
    Returns:
        Sum of a and b
    """
    return a + b


def subtract(a: Union[int, float], b: Union[int, float]) -> Union[int, float]:
    """Subtract two numbers.
    
    Args:
        a: First number
        b: Second number
    
    Returns:
        Difference of a and b
    """
    return a - b


def multiply(a: Union[int, float], b: Union[int, float]) -> Union[int, float]:
    """Multiply two numbers.
    
    Args:
        a: First number
        b: Second number
    
    Returns:
        Product of a and b
    """
    return a * b


def divide(a: Union[int, float], b: Union[int, float]) -> Union[int, float]:
    """Divide two numbers.
    
    Args:
        a: Dividend
        b: Divisor
    
    Returns:
        Quotient of a and b
    
    Raises:
        ValueError: If divisor is zero
    """
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b


def calculate_expression(expression: str) -> Union[int, float]:
    """Evaluate a mathematical expression using safe AST parsing.
    
    Args:
        expression: String containing mathematical expression
    
    Returns:
        Result of the expression evaluation
    
    Raises:
        ValueError: If expression is invalid or contains syntax errors
    """
    import ast
    import operator
    
    # Remove whitespace
    expression = expression.replace(" ", "")
    
    # Basic validation
    if not expression:
        raise ValueError("Empty expression")
    
    # Length limit for security
    if len(expression) > 1000:
        raise ValueError("Expression too long")
    
    # Check for invalid patterns
    invalid_patterns = [
        r'\+\*',  # +* sequence
        r'\-\*',  # -* sequence
        r'\*\+',  # *+ sequence
        r'\*\-',  # *- sequence
        r'\*\*',  # ** sequence
        r'\/\*',  # /* sequence
        r'\*\/',  # */ sequence
        r'\/\/',  # // sequence
        r'\+\+',  # ++ sequence
        r'\-\-',  # -- sequence
        r'\(\)',  # empty parentheses
        r'[+\-*/]{2,}',  # multiple operators in sequence
        r'[+\-*/]$',  # expression ending with operator
        r'^[*/]',  # expression starting with * or /
        r'__\w+__',  # dunder methods
        r'\.[a-zA-Z]\w*',    # attribute access (but not decimal numbers)
        r'import',   # import statements
        r'exec|eval|globals|locals|dir|vars|open|file',  # dangerous functions
    ]
    
    for pattern in invalid_patterns:
        if re.search(pattern, expression, re.IGNORECASE):
            raise ValueError("Invalid expression syntax")
    
    # Check for unmatched parentheses
    open_count = expression.count('(')
    close_count = expression.count(')')
    if open_count != close_count:
        raise ValueError("Unmatched parentheses")
    
    # Check for invalid characters - strict whitelist
    valid_chars = set('0123456789+-*/().')
    if not all(c in valid_chars for c in expression):
        raise ValueError("Invalid characters in expression")
    
    # Check nesting depth
    max_depth = 10
    depth = 0
    for char in expression:
        if char == '(':
            depth += 1
            if depth > max_depth:
                raise ValueError("Expression nesting too deep")
        elif char == ')':
            depth -= 1
    
    # Safe evaluation using AST
    ops = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }
    
    def eval_node(node):
        if isinstance(node, ast.Constant):  # Numbers
            return node.value
        elif isinstance(node, ast.Num):  # Python < 3.8 compatibility
            return node.n
        elif isinstance(node, ast.BinOp):  # Binary operations
            left = eval_node(node.left)
            right = eval_node(node.right)
            if type(node.op) not in ops:
                raise ValueError(f"Unsupported operation: {type(node.op)}")
            if isinstance(node.op, ast.Div) and right == 0:
                raise ValueError("Cannot divide by zero")
            return ops[type(node.op)](left, right)
        elif isinstance(node, ast.UnaryOp):  # Unary operations
            operand = eval_node(node.operand)
            if type(node.op) not in ops:
                raise ValueError(f"Unsupported operation: {type(node.op)}")
            return ops[type(node.op)](operand)
        else:
            raise ValueError(f"Unsupported node type: {type(node)}")
    
    try:
        tree = ast.parse(expression, mode='eval')
        result = eval_node(tree.body)
        
        # Check for invalid results
        if isinstance(result, complex):
            raise ValueError("Complex numbers not supported")
        
        return result
    except (SyntaxError, ValueError, KeyError, ZeroDivisionError) as e:
        raise ValueError(f"Invalid expression: {str(e)}")