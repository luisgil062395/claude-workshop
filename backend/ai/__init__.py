"""Claude interpretation layer.

Deliberately knows nothing about Django models or the database: every function
here takes plain arguments and returns plain dicts. That is what makes it
structurally impossible for model output to reach the Expense table without
passing through expenses/serializers.py first (CLAUDE.md section 23).
"""
