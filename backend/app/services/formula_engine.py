# backend/app/services/formula_engine.py

"""
Safe mathematical expression evaluator.
Parses formulas like "revenue - opex - depreciation" against a variable dictionary.
NO eval() — uses AST parsing for safety.
"""

import ast
import operator
import math
from typing import Dict, Optional


# Allowed operations
SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
    ast.Mod: operator.mod,
}

# Allowed functions users can call in formulas
SAFE_FUNCTIONS = {
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
    "sqrt": math.sqrt,
}


class FormulaError(Exception):
    """Raised when a formula cannot be parsed or evaluated."""
    pass


class FormulaEngine:
    """
    Evaluates mathematical expressions safely using Python's AST.

    Usage:
        engine = FormulaEngine({"revenue": 100, "opex": 40})
        result = engine.evaluate("revenue - opex")  # → 60.0
    """

    def __init__(self, variables: Dict[str, float]):
        # Normalize variable names to lowercase with underscores
        self.variables = {
            self._normalize_name(k): float(v)
            for k, v in variables.items()
        }

    @staticmethod
    def _normalize_name(name: str) -> str:
        """Normalize variable name: lowercase, spaces→underscores, strip."""
        return name.strip().lower().replace(" ", "_").replace("-", "_")

    def evaluate(self, formula: str) -> float:
        """
        Safely evaluate a formula string.
        Raises FormulaError on any issue.
        """
        if not formula or not formula.strip():
            raise FormulaError("Empty formula")

        # Normalize the formula for parsing
        normalized = self._normalize_formula(formula)

        try:
            tree = ast.parse(normalized, mode="eval")
        except SyntaxError as e:
            raise FormulaError(f"Syntax error in formula: {e}")

        try:
            result = self._eval_node(tree.body)
        except FormulaError:
            raise
        except ZeroDivisionError:
            raise FormulaError("Division by zero")
        except Exception as e:
            raise FormulaError(f"Evaluation error: {e}")

        if not isinstance(result, (int, float)):
            raise FormulaError(f"Formula did not produce a number: {type(result)}")

        if math.isnan(result) or math.isinf(result):
            raise FormulaError("Formula produced NaN or Infinity")

        return float(result)

    def _normalize_formula(self, formula: str) -> str:
        """
        Prepare formula for AST parsing.
        Only lowercases — variable names are already normalized by the frontend.
        Do NOT replace '-' with '_' here because '-' is the subtraction operator.
        """
        return formula.strip().lower()

    def _eval_node(self, node: ast.AST) -> float:
        """Recursively evaluate an AST node."""

        # Number literal
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)

        # Variable reference
        if isinstance(node, ast.Name):
            var_name = self._normalize_name(node.id)
            if var_name not in self.variables:
                available = ", ".join(sorted(self.variables.keys()))
                raise FormulaError(
                    f"Unknown variable '{node.id}'. Available: {available}"
                )
            return self.variables[var_name]

        # Unary operator (-x, +x)
        if isinstance(node, ast.UnaryOp):
            op_func = SAFE_OPERATORS.get(type(node.op))
            if op_func is None:
                raise FormulaError(f"Unsupported unary operator: {type(node.op).__name__}")
            return op_func(self._eval_node(node.operand))

        # Binary operator (x + y, x * y, etc.)
        if isinstance(node, ast.BinOp):
            op_func = SAFE_OPERATORS.get(type(node.op))
            if op_func is None:
                raise FormulaError(f"Unsupported operator: {type(node.op).__name__}")
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            return op_func(left, right)

        # Function call: abs(), min(), max(), round(), sqrt()
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise FormulaError("Only simple function calls are allowed")
            func_name = node.func.id.lower()
            if func_name not in SAFE_FUNCTIONS:
                raise FormulaError(
                    f"Unknown function '{func_name}'. Allowed: {', '.join(SAFE_FUNCTIONS.keys())}"
                )
            args = [self._eval_node(arg) for arg in node.args]
            return float(SAFE_FUNCTIONS[func_name](*args))

        raise FormulaError(f"Unsupported expression type: {type(node).__name__}")


def validate_formula(formula: str, available_variables: list) -> Optional[str]:
    """
    Validate a formula without evaluating it.
    Returns None if valid, or an error message string.
    """
    dummy_vars = {v: 1.0 for v in available_variables}
    engine = FormulaEngine(dummy_vars)
    try:
        engine.evaluate(formula)
        return None
    except FormulaError as e:
        return str(e)


def compute_scenario_tables(config_data: dict) -> dict:
    """
    Main computation function.
    Takes a full config (global vars, derived metrics, scenarios, table config)
    and produces all output tables + chart data.

    Returns: {
        baseCase: {metric: value, ...},
        scenarioResults: {scenarioId: {metric: value, ...}, ...},
        table1: [...],
        table2: [...],
        waterfalls: {stress: [...], shock: [...], opportunity: [...]},
        displayMetrics: [...],
        errors: [...],  # any formula errors encountered
    }
    """
    global_vars = config_data.get("global_variables", [])
    derived_metrics = config_data.get("derived_metrics", [])
    scenarios = config_data.get("scenarios", [])
    table_config = config_data.get("table_config", {})

    errors = []

    # ── 1. Build base case variable dictionary ──
    base_vars: Dict[str, float] = {}
    for v in global_vars:
        name = FormulaEngine._normalize_name(v["name"])
        base_vars[name] = float(v["value"])

    # ── 2. Compute base case derived metrics ──
    engine = FormulaEngine(base_vars)
    base_derived: Dict[str, float] = {}
    for dm in derived_metrics:
        name = FormulaEngine._normalize_name(dm["name"])
        formula = dm.get("formula", "")
        try:
            val = engine.evaluate(formula)
            base_derived[name] = val
            engine.variables[name] = val
        except FormulaError as e:
            errors.append(f"Base derived '{dm.get('name', name)}': {e}")
            base_derived[name] = 0.0
            engine.variables[name] = 0.0

    base_all = {**base_vars, **base_derived}

    # ── 3. Compute each scenario ──
    scenario_results: Dict[str, Dict[str, float]] = {}

    for sc in scenarios:
        sc_id = sc["id"]
        sc_name = sc.get("name", sc_id)

        # Start with base variables, apply overrides
        sc_vars = dict(base_vars)
        for ov in sc.get("overrides", []):
            ov_name = FormulaEngine._normalize_name(ov.get("name", ""))
            if ov_name:
                sc_vars[ov_name] = float(ov["value"])

        # Compute base derived metrics with scenario's variables
        sc_engine = FormulaEngine(sc_vars)
        sc_derived: Dict[str, float] = {}

        for dm in derived_metrics:
            name = FormulaEngine._normalize_name(dm["name"])
            formula = dm.get("formula", "")
            try:
                val = sc_engine.evaluate(formula)
                sc_derived[name] = val
                sc_engine.variables[name] = val
            except FormulaError as e:
                errors.append(f"Scenario '{sc_name}' derived '{dm.get('name', name)}': {e}")
                sc_derived[name] = 0.0
                sc_engine.variables[name] = 0.0

        # Scenario-specific derived metrics
        for sdm in sc.get("derived", []):
            name = FormulaEngine._normalize_name(sdm.get("name", ""))
            formula = sdm.get("formula", "")
            if not name or not formula:
                continue
            try:
                val = sc_engine.evaluate(formula)
                sc_derived[name] = val
                sc_engine.variables[name] = val
            except FormulaError as e:
                errors.append(f"Scenario '{sc_name}' custom '{sdm.get('name', name)}': {e}")
                sc_derived[name] = 0.0
                sc_engine.variables[name] = 0.0

        scenario_results[sc_id] = {**sc_vars, **sc_derived}

    # ── 4. Build output tables ──

    display_metrics = table_config.get("display_metrics", [])
    if not display_metrics:
        display_metrics = [dm["name"] for dm in derived_metrics if dm.get("name")]

    weights = table_config.get("weights", {
        "stress": 0.7,
        "shock": 0.3,
        "opportunity": 1.0,
    })

    # Table 1: Absolute values
    table1_rows = []
    for metric_name in display_metrics:
        norm_name = FormulaEngine._normalize_name(metric_name)
        row = {
            "metric": metric_name,
            "baseCase": base_all.get(norm_name, 0.0),
            "scenarios": {},
        }
        for sc in scenarios:
            sc_id = sc["id"]
            row["scenarios"][sc_id] = scenario_results.get(sc_id, {}).get(norm_name, 0.0)
        table1_rows.append(row)

    # Table 2: Weighted impact (delta from base × weight)
    table2_rows = []
    for metric_name in display_metrics:
        norm_name = FormulaEngine._normalize_name(metric_name)
        base_val = base_all.get(norm_name, 0.0)
        row = {
            "metric": metric_name,
            "scenarios": {},
        }
        for sc in scenarios:
            sc_id = sc["id"]
            sc_type = sc.get("type", "stress")
            sc_val = scenario_results.get(sc_id, {}).get(norm_name, 0.0)
            delta = sc_val - base_val
            weight = weights.get(sc_type, 1.0)
            row["scenarios"][sc_id] = {
                "absolute": sc_val,
                "delta": delta,
                "weight": weight,
                "weighted": delta * weight,
            }
        table2_rows.append(row)



    # ── 5. Build waterfall data ──
    # Mirror the old /scenario-automate waterfall style:
    # Start with base case of the FIRST waterfall metric, then show cumulative
    # impact bars for EACH waterfall metric (even if 0), then final adjusted total.
    waterfalls = {"stress": [], "shock": [], "opportunity": [], "combined": []}

    waterfall_metrics = table_config.get("waterfall_metrics", []) or display_metrics

    def build_waterfall(type_scenarios, label_prefix):
        if not waterfall_metrics:
            return []
        cascade = []
        first_metric = waterfall_metrics[0]
        first_norm = FormulaEngine._normalize_name(first_metric)
        base_start = base_all.get(first_norm, 0.0)

        cascade.append({
            "label": f"Base {first_metric}",
            "value": base_start,
            "type": "base",
        })

        running = base_start

        for metric_name in waterfall_metrics:
            norm_name = FormulaEngine._normalize_name(metric_name)
            base_val = base_all.get(norm_name, 0.0)

            # Sum weighted impact across all scenarios of this type for this metric
            total_impact = 0.0
            for sc in type_scenarios:
                sc_id = sc["id"]
                sc_type = sc.get("type", "stress")
                sc_val = scenario_results.get(sc_id, {}).get(norm_name, 0.0)
                w = weights.get(sc_type, 1.0)
                total_impact += (sc_val - base_val) * w

            cascade.append({
                "label": f"{metric_name} Impact",
                "value": total_impact,
                "type": "positive" if total_impact >= 0 else "negative",
            })
            running += total_impact

        cascade.append({
            "label": f"Adjusted {waterfall_metrics[-1]}",
            "value": running,
            "type": "total",
        })

        return cascade

    stress_scenarios = [s for s in scenarios if s.get("type") == "stress"]
    shock_scenarios = [s for s in scenarios if s.get("type") == "shock"]
    opp_scenarios = [s for s in scenarios if s.get("type") == "opportunity"]

    waterfalls["stress"] = build_waterfall(stress_scenarios, "Stress")
    waterfalls["shock"] = build_waterfall(shock_scenarios, "Shock")
    waterfalls["opportunity"] = build_waterfall(opp_scenarios, "Opportunity")
    # 4th chart: stress + opportunity combined (like old table6)
    waterfalls["combined"] = build_waterfall(stress_scenarios + opp_scenarios, "Combined")


    return {
        "baseCase": base_all,
        "scenarioResults": scenario_results,
        "table1": table1_rows,
        "table2": table2_rows,
        "waterfalls": waterfalls,
        "displayMetrics": display_metrics,
        "errors": errors,
    }