import pytest
from src.calculator import add, subtract, multiply, divide, calculate_expression

class TestCalculatorBasic:
    def test_add(self):
        assert add(2, 3) == 5
        assert add(-1, 1) == 0
        assert add(0, 0) == 0
    
    def test_subtract(self):
        assert subtract(5, 3) == 2
        assert subtract(1, 1) == 0
        assert subtract(0, 5) == -5
    
    def test_multiply(self):
        assert multiply(2, 3) == 6
        assert multiply(-1, 5) == -5
        assert multiply(0, 5) == 0
    
    def test_divide(self):
        assert divide(6, 3) == 2
        assert divide(5, 2) == 2.5
        assert divide(-10, 2) == -5
    
    def test_divide_by_zero(self):
        with pytest.raises(ValueError):
            divide(5, 0)

class TestCalculatorExpression:
    def test_simple_expressions(self):
        assert calculate_expression("2 + 3") == 5
        assert calculate_expression("5 - 3") == 2
        assert calculate_expression("2 * 3") == 6
        assert calculate_expression("6 / 3") == 2
    
    def test_complex_expressions(self):
        assert calculate_expression("2 + 3 * 4") == 14
        assert calculate_expression("(2 + 3) * 4") == 20
        assert calculate_expression("2 + 3 * 4 - 1") == 13
    
    def test_whitespace_handling(self):
        assert calculate_expression("2+3") == 5
        assert calculate_expression(" 2 + 3 ") == 5
    
    def test_invalid_expressions(self):
        with pytest.raises(ValueError):
            calculate_expression("2 + * 3")
        with pytest.raises(ValueError):
            calculate_expression("2 + 3)")
