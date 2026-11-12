

# # backend/app/services/formula_engine.py
# """
# Safe mathematical expression evaluator.
# Parses formulas like "revenue - opex - depreciation" against a variable dictionary.
# NO eval() — uses AST parsing for safety.
# """

# import ast
# import operator
# import math
# from typing import Dict, Optional


# # Allowed operations
# SAFE_OPERATORS = {
#     ast.Add: operator.add,
#     ast.Sub: operator.sub,
#     ast.Mult: operator.mul,
#     ast.Div: operator.truediv,
#     ast.Pow: operator.pow,
#     ast.USub: operator.neg,
#     ast.UAdd: operator.pos,
#     ast.Mod: operator.mod,
# }

# # Allowed functions users can call in formulas
# SAFE_FUNCTIONS = {
#     "abs": abs,
#     "min": min,
#     "max": max,
#     "round": round,
#     "sqrt": math.sqrt,
# }


# class FormulaError(Exception):
#     """Raised when a formula cannot be parsed or evaluated."""
#     pass


# class FormulaEngine:
#     """
#     Evaluates mathematical expressions safely using Python's AST.

#     Usage:
#         engine = FormulaEngine({"revenue": 100, "opex": 40})
#         result = engine.evaluate("revenue - opex")  # → 60.0
#     """

#     def __init__(self, variables: Dict[str, float]):
#         # Normalize variable names to lowercase with underscores
#         self.variables = {
#             self._normalize_name(k): float(v)
#             for k, v in variables.items()
#         }

#     @staticmethod
#     def _normalize_name(name: str) -> str:
#         """Normalize variable name: lowercase, spaces→underscores, strip."""
#         return name.strip().lower().replace(" ", "_").replace("-", "_")

#     def evaluate(self, formula: str) -> float:
#         """
#         Safely evaluate a formula string.
#         Raises FormulaError on any issue.
#         """
#         if not formula or not formula.strip():
#             raise FormulaError("Empty formula")

#         # Normalize the formula for parsing
#         normalized = self._normalize_formula(formula)

#         try:
#             tree = ast.parse(normalized, mode="eval")
#         except SyntaxError as e:
#             raise FormulaError(f"Syntax error in formula: {e}")

#         try:
#             result = self._eval_node(tree.body)
#         except FormulaError:
#             raise
#         except ZeroDivisionError:
#             raise FormulaError("Division by zero")
#         except Exception as e:
#             raise FormulaError(f"Evaluation error: {e}")

#         if not isinstance(result, (int, float)):
#             raise FormulaError(f"Formula did not produce a number: {type(result)}")

#         if math.isnan(result) or math.isinf(result):
#             raise FormulaError("Formula produced NaN or Infinity")

#         return float(result)

#     def _normalize_formula(self, formula: str) -> str:
#         """
#         Prepare formula for AST parsing.
#         Only lowercases — variable names are already normalized by the frontend.
#         Do NOT replace '-' with '_' here because '-' is the subtraction operator.
#         """
#         return formula.strip().lower()

#     def _eval_node(self, node: ast.AST) -> float:
#         """Recursively evaluate an AST node."""

#         # Number literal
#         if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
#             return float(node.value)

#         # Variable reference
#         if isinstance(node, ast.Name):
#             var_name = self._normalize_name(node.id)
#             if var_name not in self.variables:
#                 available = ", ".join(sorted(self.variables.keys()))
#                 raise FormulaError(
#                     f"Unknown variable '{node.id}'. Available: {available}"
#                 )
#             return self.variables[var_name]

#         # Unary operator (-x, +x)
#         if isinstance(node, ast.UnaryOp):
#             op_func = SAFE_OPERATORS.get(type(node.op))
#             if op_func is None:
#                 raise FormulaError(f"Unsupported unary operator: {type(node.op).__name__}")
#             return op_func(self._eval_node(node.operand))

#         # Binary operator (x + y, x * y, etc.)
#         if isinstance(node, ast.BinOp):
#             op_func = SAFE_OPERATORS.get(type(node.op))
#             if op_func is None:
#                 raise FormulaError(f"Unsupported operator: {type(node.op).__name__}")
#             left = self._eval_node(node.left)
#             right = self._eval_node(node.right)
#             return op_func(left, right)

#         # Function call: abs(), min(), max(), round(), sqrt()
#         if isinstance(node, ast.Call):
#             if not isinstance(node.func, ast.Name):
#                 raise FormulaError("Only simple function calls are allowed")
#             func_name = node.func.id.lower()
#             if func_name not in SAFE_FUNCTIONS:
#                 raise FormulaError(
#                     f"Unknown function '{func_name}'. Allowed: {', '.join(SAFE_FUNCTIONS.keys())}"
#                 )
#             args = [self._eval_node(arg) for arg in node.args]
#             return float(SAFE_FUNCTIONS[func_name](*args))

#         raise FormulaError(f"Unsupported expression type: {type(node).__name__}")


# def validate_formula(formula: str, available_variables: list) -> Optional[str]:
#     """
#     Validate a formula without evaluating it.
#     Returns None if valid, or an error message string.
#     """
#     dummy_vars = {v: 1.0 for v in available_variables}
#     engine = FormulaEngine(dummy_vars)
#     try:
#         engine.evaluate(formula)
#         return None
#     except FormulaError as e:
#         return str(e)


# def compute_scenario_tables(config_data: dict) -> dict:
#     """
#     Main computation function.
#     Takes a full config (global vars, derived metrics, scenarios, table config)
#     and produces all output tables + chart data.

#     Each derived metric has a base case formula and (optionally) one formula
#     per scenario in `scenario_formulas` (keyed by scenario id). If a scenario
#     has no formula for a metric, the base case formula is used.

#     Each scenario's variable set is built as:
#         base variables  →  scenario overrides (overwrite base values)
#                         →  scenario variables (new, scenario-only variables)
#     These variables are visible ONLY to that scenario's calculations.

#     Returns: {
#         baseCase: {metric: value, ...},
#         scenarioResults: {scenarioId: {metric: value, ...}, ...},
#         table1: [...],
#         table2: [...],
#         waterfalls: {stress: [...], shock: [...], opportunity: [...]},
#         displayMetrics: [...],
#         errors: [...],  # any formula errors encountered
#     }
#     """
#     global_vars = config_data.get("global_variables", [])
#     derived_metrics = config_data.get("derived_metrics", [])
#     scenarios = config_data.get("scenarios", [])
#     table_config = config_data.get("table_config", {})

#     errors = []

#     # ── 1. Build base case variable dictionary ──
#     base_vars: Dict[str, float] = {}
#     for v in global_vars:
#         name = FormulaEngine._normalize_name(v["name"])
#         base_vars[name] = float(v["value"])

#     # ── 2. Compute base case derived metrics ──
#     engine = FormulaEngine(base_vars)
#     base_derived: Dict[str, float] = {}
#     for dm in derived_metrics:
#         name = FormulaEngine._normalize_name(dm["name"])
#         formula = dm.get("formula", "")
#         try:
#             val = engine.evaluate(formula)
#             base_derived[name] = val
#             engine.variables[name] = val
#         except FormulaError as e:
#             errors.append(f"Base derived '{dm.get('name', name)}': {e}")
#             base_derived[name] = 0.0
#             engine.variables[name] = 0.0

#     base_all = {**base_vars, **base_derived}

#     # ── 3. Compute each scenario ──
#     scenario_results: Dict[str, Dict[str, float]] = {}

#     for sc in scenarios:
#         sc_id = sc["id"]
#         sc_name = sc.get("name", sc_id)

#         # Start with base variables, apply overrides (overwrite base values for this scenario only)
#         sc_vars = dict(base_vars)
#         for ov in sc.get("overrides", []) or []:
#             ov_name = FormulaEngine._normalize_name(ov.get("name", ""))
#             if ov_name:
#                 sc_vars[ov_name] = float(ov["value"])

#         # Add scenario-only variables (new variables that exist only in this scenario)
#         for sv in sc.get("variables", []) or []:
#             sv_name = FormulaEngine._normalize_name(sv.get("name", ""))
#             if sv_name:
#                 sc_vars[sv_name] = float(sv.get("value", 0.0))

#         # Compute derived metrics using this scenario's own formula
#         sc_engine = FormulaEngine(sc_vars)
#         sc_derived: Dict[str, float] = {}

#         for dm in derived_metrics:
#             name = FormulaEngine._normalize_name(dm["name"])
#             # Use this scenario's own formula; fall back to base formula if none set
#             formula = (dm.get("scenario_formulas") or {}).get(sc_id) or dm.get("formula", "")
#             try:
#                 val = sc_engine.evaluate(formula)
#                 sc_derived[name] = val
#                 sc_engine.variables[name] = val
#             except FormulaError as e:
#                 errors.append(f"Scenario '{sc_name}' derived '{dm.get('name', name)}': {e}")
#                 sc_derived[name] = 0.0
#                 sc_engine.variables[name] = 0.0

#         # Scenario-specific derived metrics (legacy; no longer created by the UI)
#         for sdm in sc.get("derived", []) or []:
#             name = FormulaEngine._normalize_name(sdm.get("name", ""))
#             formula = sdm.get("formula", "")
#             if not name or not formula:
#                 continue
#             try:
#                 val = sc_engine.evaluate(formula)
#                 sc_derived[name] = val
#                 sc_engine.variables[name] = val
#             except FormulaError as e:
#                 errors.append(f"Scenario '{sc_name}' custom '{sdm.get('name', name)}': {e}")
#                 sc_derived[name] = 0.0
#                 sc_engine.variables[name] = 0.0

#         scenario_results[sc_id] = {**sc_vars, **sc_derived}

#     # ── 4. Build output tables ──

#     display_metrics = table_config.get("display_metrics", [])
#     if not display_metrics:
#         display_metrics = [dm["name"] for dm in derived_metrics if dm.get("name")]

#     weights = table_config.get("weights", {
#         "stress": 0.7,
#         "shock": 0.3,
#         "opportunity": 1.0,
#     })

#     # Table 1: Absolute values
#     table1_rows = []
#     for metric_name in display_metrics:
#         norm_name = FormulaEngine._normalize_name(metric_name)
#         row = {
#             "metric": metric_name,
#             "baseCase": base_all.get(norm_name, 0.0),
#             "scenarios": {},
#         }
#         for sc in scenarios:
#             sc_id = sc["id"]
#             row["scenarios"][sc_id] = scenario_results.get(sc_id, {}).get(norm_name, 0.0)
#         table1_rows.append(row)

#     # Table 2: Weighted impact (delta from base × weight)
#     table2_rows = []
#     for metric_name in display_metrics:
#         norm_name = FormulaEngine._normalize_name(metric_name)
#         base_val = base_all.get(norm_name, 0.0)
#         row = {
#             "metric": metric_name,
#             "scenarios": {},
#         }
#         for sc in scenarios:
#             sc_id = sc["id"]
#             sc_type = sc.get("type", "stress")
#             sc_val = scenario_results.get(sc_id, {}).get(norm_name, 0.0)
#             delta = sc_val - base_val
#             weight = weights.get(sc_type, 1.0)
#             row["scenarios"][sc_id] = {
#                 "absolute": sc_val,
#                 "delta": delta,
#                 "weight": weight,
#                 "weighted": delta * weight,
#             }
#         table2_rows.append(row)



#     # ── 5. Build waterfall data ──
#     # Mirror the old /scenario-automate waterfall style:
#     # Start with base case of the FIRST waterfall metric, then show cumulative
#     # impact bars for EACH waterfall metric (even if 0), then final adjusted total.
#     waterfalls = {"stress": [], "shock": [], "opportunity": [], "combined": []}

#     waterfall_metrics = table_config.get("waterfall_metrics", []) or display_metrics

#     def build_waterfall(type_scenarios, label_prefix):
#         if not waterfall_metrics:
#             return []
#         cascade = []
#         first_metric = waterfall_metrics[0]
#         first_norm = FormulaEngine._normalize_name(first_metric)
#         base_start = base_all.get(first_norm, 0.0)

#         cascade.append({
#             "label": f"Base {first_metric}",
#             "value": base_start,
#             "type": "base",
#         })

#         running = base_start

#         for metric_name in waterfall_metrics:
#             norm_name = FormulaEngine._normalize_name(metric_name)
#             base_val = base_all.get(norm_name, 0.0)

#             # Sum weighted impact across all scenarios of this type for this metric
#             total_impact = 0.0
#             for sc in type_scenarios:
#                 sc_id = sc["id"]
#                 sc_type = sc.get("type", "stress")
#                 sc_val = scenario_results.get(sc_id, {}).get(norm_name, 0.0)
#                 w = weights.get(sc_type, 1.0)
#                 total_impact += (sc_val - base_val) * w

#             cascade.append({
#                 "label": f"{metric_name} Impact",
#                 "value": total_impact,
#                 "type": "positive" if total_impact >= 0 else "negative",
#             })
#             running += total_impact

#         cascade.append({
#             "label": f"Adjusted {waterfall_metrics[-1]}",
#             "value": running,
#             "type": "total",
#         })

#         return cascade

#     stress_scenarios = [s for s in scenarios if s.get("type") == "stress"]
#     shock_scenarios = [s for s in scenarios if s.get("type") == "shock"]
#     opp_scenarios = [s for s in scenarios if s.get("type") == "opportunity"]

#     waterfalls["stress"] = build_waterfall(stress_scenarios, "Stress")
#     waterfalls["shock"] = build_waterfall(shock_scenarios, "Shock")
#     waterfalls["opportunity"] = build_waterfall(opp_scenarios, "Opportunity")
#     # 4th chart: stress + opportunity combined (like old table6)
#     waterfalls["combined"] = build_waterfall(stress_scenarios + opp_scenarios, "Combined")


#     return {
#         "baseCase": base_all,
#         "scenarioResults": scenario_results,
#         "table1": table1_rows,
#         "table2": table2_rows,
#         "waterfalls": waterfalls,
#         "displayMetrics": display_metrics,
#         "errors": errors,
#     }




# # backend/app/services/formula_engine.py
# """
# Safe mathematical expression evaluator.
# Parses formulas like "revenue - opex - depreciation" against a variable dictionary.
# NO eval() — uses AST parsing for safety.
# """

# import ast
# import operator
# import math
# import re
# from typing import Dict, List, Optional, Tuple


# # Allowed operations
# SAFE_OPERATORS = {
#     ast.Add: operator.add,
#     ast.Sub: operator.sub,
#     ast.Mult: operator.mul,
#     ast.Div: operator.truediv,
#     ast.Pow: operator.pow,
#     ast.USub: operator.neg,
#     ast.UAdd: operator.pos,
#     ast.Mod: operator.mod,
# }

# # Allowed functions users can call in formulas
# SAFE_FUNCTIONS = {
#     "abs": abs,
#     "min": min,
#     "max": max,
#     "round": round,
#     "sqrt": math.sqrt,
# }


# class FormulaError(Exception):
#     """Raised when a formula cannot be parsed or evaluated."""
#     pass


# class FormulaEngine:
#     """
#     Evaluates mathematical expressions safely using Python's AST.

#     Usage:
#         engine = FormulaEngine({"revenue": 100, "opex": 40})
#         result = engine.evaluate("revenue - opex")  # → 60.0
#     """

#     def __init__(self, variables: Dict[str, float]):
#         # Normalize variable names to lowercase with underscores
#         self.variables = {
#             self._normalize_name(k): float(v)
#             for k, v in variables.items()
#         }

#     @staticmethod
#     def _normalize_name(name: str) -> str:
#         """Normalize variable name: lowercase, spaces→underscores, strip."""
#         return name.strip().lower().replace(" ", "_").replace("-", "_")

#     def evaluate(self, formula: str) -> float:
#         """
#         Safely evaluate a formula string.
#         Raises FormulaError on any issue.
#         """
#         if not formula or not formula.strip():
#             raise FormulaError("Empty formula")

#         # Normalize the formula for parsing
#         normalized = self._normalize_formula(formula)

#         try:
#             tree = ast.parse(normalized, mode="eval")
#         except SyntaxError as e:
#             raise FormulaError(f"Syntax error in formula: {e}")

#         try:
#             result = self._eval_node(tree.body)
#         except FormulaError:
#             raise
#         except ZeroDivisionError:
#             raise FormulaError("Division by zero")
#         except Exception as e:
#             raise FormulaError(f"Evaluation error: {e}")

#         if not isinstance(result, (int, float)):
#             raise FormulaError(f"Formula did not produce a number: {type(result)}")

#         if math.isnan(result) or math.isinf(result):
#             raise FormulaError("Formula produced NaN or Infinity")

#         return float(result)

#     def _normalize_formula(self, formula: str) -> str:
#         """
#         Prepare formula for AST parsing.
#         Only lowercases — variable names are already normalized by the frontend.
#         Do NOT replace '-' with '_' here because '-' is the subtraction operator.
#         """
#         return formula.strip().lower()

#     def _eval_node(self, node: ast.AST) -> float:
#         """Recursively evaluate an AST node."""

#         # Number literal
#         if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
#             return float(node.value)

#         # Variable reference
#         if isinstance(node, ast.Name):
#             var_name = self._normalize_name(node.id)
#             if var_name not in self.variables:
#                 available = ", ".join(sorted(self.variables.keys()))
#                 raise FormulaError(
#                     f"Unknown variable '{node.id}'. Available: {available}"
#                 )
#             return self.variables[var_name]

#         # Unary operator (-x, +x)
#         if isinstance(node, ast.UnaryOp):
#             op_func = SAFE_OPERATORS.get(type(node.op))
#             if op_func is None:
#                 raise FormulaError(f"Unsupported unary operator: {type(node.op).__name__}")
#             return op_func(self._eval_node(node.operand))

#         # Binary operator (x + y, x * y, etc.)
#         if isinstance(node, ast.BinOp):
#             op_func = SAFE_OPERATORS.get(type(node.op))
#             if op_func is None:
#                 raise FormulaError(f"Unsupported operator: {type(node.op).__name__}")
#             left = self._eval_node(node.left)
#             right = self._eval_node(node.right)
#             return op_func(left, right)

#         # Function call: abs(), min(), max(), round(), sqrt()
#         if isinstance(node, ast.Call):
#             if not isinstance(node.func, ast.Name):
#                 raise FormulaError("Only simple function calls are allowed")
#             func_name = node.func.id.lower()
#             if func_name not in SAFE_FUNCTIONS:
#                 raise FormulaError(
#                     f"Unknown function '{func_name}'. Allowed: {', '.join(SAFE_FUNCTIONS.keys())}"
#                 )
#             args = [self._eval_node(arg) for arg in node.args]
#             return float(SAFE_FUNCTIONS[func_name](*args))

#         raise FormulaError(f"Unsupported expression type: {type(node).__name__}")


# def validate_formula(formula: str, available_variables: list) -> Optional[str]:
#     """
#     Validate a formula without evaluating it.
#     Returns None if valid, or an error message string.
#     """
#     dummy_vars = {v: 1.0 for v in available_variables}
#     engine = FormulaEngine(dummy_vars)
#     try:
#         engine.evaluate(formula)
#         return None
#     except FormulaError as e:
#         return str(e)


# # ── Stage-variable naming (MUST match the frontend's buildStageVars) ──────

# SECTION_KEYS = ["stress", "shock", "opportunity", "combined"]


# def _slug(s: str) -> str:
#     """lowercase, every run of non [a-z0-9] characters → '_', trim '_' at the ends."""
#     return re.sub(r"[^a-z0-9]+", "_", (s or "").strip().lower()).strip("_")


# def _stage_tokens(metric_names: List[str], scenarios: List[dict]) -> List[Tuple[str, int, str]]:
#     """
#     Build the formula variables a table exposes to the NEXT stage.
#     Returns [(token, metric_index, column)] where column is "base" or a scenario id.

#     Token format:
#         <metric>_base_case
#         <metric>_<scenario name>
#     e.g. "contribution margin" + "20% of must win initiatives fail"
#         → contribution_margin_20_of_must_win_initiatives_fail
#     Duplicates get _2, _3 ... in generation order.
#     """
#     used = set()
#     out: List[Tuple[str, int, str]] = []

#     def uniq(token: str) -> str:
#         candidate = token
#         i = 2
#         while candidate in used:
#             candidate = f"{token}_{i}"
#             i += 1
#         used.add(candidate)
#         return candidate

#     for mi, metric in enumerate(metric_names):
#         ms = _slug(metric)
#         out.append((uniq(f"{ms}_base_case"), mi, "base"))
#         for sc in scenarios:
#             ss = _slug(sc.get("name") or "") or _slug(sc["id"])
#             out.append((uniq(f"{ms}_{ss}"), mi, sc["id"]))
#     return out


# def _build_waterfall(rows: List[dict]) -> List[dict]:
#     """
#     Turn a section table into waterfall bars.
#     First metric = starting (base) bar, last metric = total bar (when 2+ metrics),
#     everything in between = impact bars coloured by sign.
#     """
#     n = len(rows)
#     items: List[dict] = []
#     for i, row in enumerate(rows):
#         value = row["value"]
#         if i == 0:
#             kind = "base"
#         elif i == n - 1:
#             kind = "total"
#         else:
#             kind = "positive" if value >= 0 else "negative"
#         items.append({"label": row["metric"], "value": value, "type": kind})
#     return items


# def compute_scenario_tables(config_data: dict) -> dict:
#     """
#     Main computation function.

#     Pipeline
#       Stage 3  derived metrics        → Table 1 (metrics × base case + scenarios)
#       Stage 5  weighted metrics       → Table 2 (same shape; formulas use Table 1 variables only)
#       Stage 7  section tables 3–6     → single value per metric (formulas use Table 2 variables only)
#       Waterfalls are built from the four section tables.

#     Each scenario's variable set is built as:
#         base variables → scenario overrides → scenario-only variables
#     and is visible ONLY to that scenario's calculations.

#     Returns: {
#         baseCase, scenarioResults,
#         table1: [{metric, baseCase, scenarios}],
#         table2: [{metric, baseCase, scenarios}],      # weighted table ("<metric> wghtd")
#         sectionTables: {stress|shock|opportunity|combined: [{metric, value}]},
#         waterfalls:    {stress|shock|opportunity|combined: [{label, value, type}]},
#         displayMetrics, errors,
#     }
#     """
#     global_vars = config_data.get("global_variables", [])
#     derived_metrics = config_data.get("derived_metrics", [])
#     scenarios = config_data.get("scenarios", [])
#     table_config = config_data.get("table_config", {}) or {}

#     errors: List[str] = []

#     # ── 1. Build base case variable dictionary ──
#     base_vars: Dict[str, float] = {}
#     for v in global_vars:
#         name = FormulaEngine._normalize_name(v["name"])
#         base_vars[name] = float(v["value"])

#     # ── 2. Compute base case derived metrics ──
#     engine = FormulaEngine(base_vars)
#     base_derived: Dict[str, float] = {}
#     for dm in derived_metrics:
#         name = FormulaEngine._normalize_name(dm["name"])
#         formula = dm.get("formula", "")
#         try:
#             val = engine.evaluate(formula)
#             base_derived[name] = val
#             engine.variables[name] = val
#         except FormulaError as e:
#             errors.append(f"Base derived '{dm.get('name', name)}': {e}")
#             base_derived[name] = 0.0
#             engine.variables[name] = 0.0

#     base_all = {**base_vars, **base_derived}

#     # ── 3. Compute each scenario ──
#     scenario_results: Dict[str, Dict[str, float]] = {}

#     for sc in scenarios:
#         sc_id = sc["id"]
#         sc_name = sc.get("name", sc_id)

#         # Start with base variables, apply overrides (overwrite base values for this scenario only)
#         sc_vars = dict(base_vars)
#         for ov in sc.get("overrides", []) or []:
#             ov_name = FormulaEngine._normalize_name(ov.get("name", ""))
#             if ov_name:
#                 sc_vars[ov_name] = float(ov["value"])

#         # Add scenario-only variables (new variables that exist only in this scenario)
#         for sv in sc.get("variables", []) or []:
#             sv_name = FormulaEngine._normalize_name(sv.get("name", ""))
#             if sv_name:
#                 sc_vars[sv_name] = float(sv.get("value", 0.0))

#         # Compute derived metrics using this scenario's own formula
#         sc_engine = FormulaEngine(sc_vars)
#         sc_derived: Dict[str, float] = {}

#         for dm in derived_metrics:
#             name = FormulaEngine._normalize_name(dm["name"])
#             # Use this scenario's own formula; fall back to base formula if none set
#             formula = (dm.get("scenario_formulas") or {}).get(sc_id) or dm.get("formula", "")
#             try:
#                 val = sc_engine.evaluate(formula)
#                 sc_derived[name] = val
#                 sc_engine.variables[name] = val
#             except FormulaError as e:
#                 errors.append(f"Scenario '{sc_name}' derived '{dm.get('name', name)}': {e}")
#                 sc_derived[name] = 0.0
#                 sc_engine.variables[name] = 0.0

#         # Scenario-specific derived metrics (legacy; no longer created by the UI)
#         for sdm in sc.get("derived", []) or []:
#             name = FormulaEngine._normalize_name(sdm.get("name", ""))
#             formula = sdm.get("formula", "")
#             if not name or not formula:
#                 continue
#             try:
#                 val = sc_engine.evaluate(formula)
#                 sc_derived[name] = val
#                 sc_engine.variables[name] = val
#             except FormulaError as e:
#                 errors.append(f"Scenario '{sc_name}' custom '{sdm.get('name', name)}': {e}")
#                 sc_derived[name] = 0.0
#                 sc_engine.variables[name] = 0.0

#         scenario_results[sc_id] = {**sc_vars, **sc_derived}

#     # ── 4. Table 1: absolute values (every derived metric) ──
#     derived_names = [dm["name"].strip() for dm in derived_metrics if (dm.get("name") or "").strip()]

#     display_metrics = table_config.get("display_metrics", []) or derived_names

#     table1_rows = []
#     for metric_name in display_metrics:
#         norm_name = FormulaEngine._normalize_name(metric_name)
#         row = {
#             "metric": metric_name,
#             "baseCase": base_all.get(norm_name, 0.0),
#             "scenarios": {},
#         }
#         for sc in scenarios:
#             sc_id = sc["id"]
#             row["scenarios"][sc_id] = scenario_results.get(sc_id, {}).get(norm_name, 0.0)
#         table1_rows.append(row)

#     # ── 5. Table 2: weighted metrics (inputs = Table 1 variables only) ──
#     stage3_values: Dict[str, float] = {}
#     for token, mi, col in _stage_tokens(derived_names, scenarios):
#         norm = FormulaEngine._normalize_name(derived_names[mi])
#         if col == "base":
#             stage3_values[token] = base_all.get(norm, 0.0)
#         else:
#             stage3_values[token] = scenario_results.get(col, {}).get(norm, 0.0)

#     engine3 = FormulaEngine(stage3_values)

#     weighted_cfg = table_config.get("weighted_metrics", []) or []
#     weighted_by_source = {
#         FormulaEngine._normalize_name(w.get("source", "")): w for w in weighted_cfg
#     }

#     weighted_names = [f"{n} wghtd" for n in derived_names]
#     weighted_base: Dict[str, float] = {}
#     weighted_scn: Dict[str, Dict[str, float]] = {sc["id"]: {} for sc in scenarios}

#     for src, wname in zip(derived_names, weighted_names):
#         w = weighted_by_source.get(FormulaEngine._normalize_name(src))
#         if w is None:
#             errors.append(f"Weighted '{wname}': no formulas defined")
#             weighted_base[wname] = 0.0
#             for sc in scenarios:
#                 weighted_scn[sc["id"]][wname] = 0.0
#             continue

#         try:
#             weighted_base[wname] = engine3.evaluate(w.get("formula", ""))
#         except FormulaError as e:
#             errors.append(f"Weighted '{wname}' base case: {e}")
#             weighted_base[wname] = 0.0

#         for sc in scenarios:
#             sc_id = sc["id"]
#             sc_name = sc.get("name", sc_id)
#             formula = (w.get("scenario_formulas") or {}).get(sc_id, "")
#             try:
#                 weighted_scn[sc_id][wname] = engine3.evaluate(formula)
#             except FormulaError as e:
#                 errors.append(f"Weighted '{wname}' scenario '{sc_name}': {e}")
#                 weighted_scn[sc_id][wname] = 0.0

#     table2_rows = []
#     for wname in weighted_names:
#         table2_rows.append({
#             "metric": wname,
#             "baseCase": weighted_base.get(wname, 0.0),
#             "scenarios": {sc["id"]: weighted_scn[sc["id"]].get(wname, 0.0) for sc in scenarios},
#         })

#     # ── 6. Section tables 3–6 (inputs = Table 2 variables only) ──
#     stage5_values: Dict[str, float] = {}
#     for token, mi, col in _stage_tokens(weighted_names, scenarios):
#         wname = weighted_names[mi]
#         if col == "base":
#             stage5_values[token] = weighted_base.get(wname, 0.0)
#         else:
#             stage5_values[token] = weighted_scn.get(col, {}).get(wname, 0.0)

#     engine5 = FormulaEngine(stage5_values)

#     section_cfg = table_config.get("section_tables", {}) or {}
#     section_tables: Dict[str, List[dict]] = {}
#     waterfalls: Dict[str, List[dict]] = {}

#     for key in SECTION_KEYS:
#         rows: List[dict] = []
#         for m in section_cfg.get(key, []) or []:
#             mname = (m.get("name") or "").strip() or "Metric"
#             try:
#                 val = engine5.evaluate(m.get("formula", ""))
#             except FormulaError as e:
#                 errors.append(f"Section '{key}' metric '{mname}': {e}")
#                 val = 0.0
#             rows.append({"metric": mname, "value": val})
#         section_tables[key] = rows
#         waterfalls[key] = _build_waterfall(rows)

#     return {
#         "baseCase": base_all,
#         "scenarioResults": scenario_results,
#         "table1": table1_rows,
#         "table2": table2_rows,
#         "sectionTables": section_tables,
#         "waterfalls": waterfalls,
#         "displayMetrics": display_metrics,
#         "errors": errors,
#     }






# backend/app/services/formula_engine.py
"""
Safe mathematical expression evaluator.
Parses formulas like "revenue - opex - depreciation" against a variable dictionary.
NO eval() — uses AST parsing for safety.
"""

import ast
import operator
import math
import re
from typing import Dict, List, Optional, Tuple


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


# ── Friendly error messages ───────────────────────────────────────────────

def _friendly(err: Exception) -> str:
    """Strip the long 'Available: ...' list and explain the most common mistakes."""
    msg = str(err)
    m = re.match(r"Unknown variable '([^']+)'", msg)
    if m:
        return (
            f"'{m.group(1)}' isn't available here. It may be calculated further down the list, "
            f"belong to another scenario, or have been renamed or deleted."
        )
    if "Division by zero" in msg:
        return "Division by zero — a denominator in this formula is 0."
    if msg.startswith("Syntax error"):
        return "The formula is incomplete or has mismatched brackets."
    return msg


SECTION_TITLES = {
    "stress": "Table 3 · Stress",
    "shock": "Table 4 · Shock",
    "opportunity": "Table 5 · Opportunities (holding all other constant)",
    "combined": "Table 6 · Opportunities (considering stress)",
}


# ── Stage-variable naming (MUST match the frontend's buildStageVars) ──────

SECTION_KEYS = ["stress", "shock", "opportunity", "combined"]


def _slug(s: str) -> str:
    """lowercase, every run of non [a-z0-9] characters → '_', trim '_' at the ends."""
    return re.sub(r"[^a-z0-9]+", "_", (s or "").strip().lower()).strip("_")


def _stage_tokens(metric_names: List[str], scenarios: List[dict]) -> List[Tuple[str, int, str]]:
    """
    Build the formula variables a table exposes to the NEXT stage.
    Returns [(token, metric_index, column)] where column is "base" or a scenario id.

    Token format:
        <metric>_base_case
        <metric>_<scenario name>
    e.g. "contribution margin" + "20% of must win initiatives fail"
        → contribution_margin_20_of_must_win_initiatives_fail
    Duplicates get _2, _3 ... in generation order.
    """
    used = set()
    out: List[Tuple[str, int, str]] = []

    def uniq(token: str) -> str:
        candidate = token
        i = 2
        while candidate in used:
            candidate = f"{token}_{i}"
            i += 1
        used.add(candidate)
        return candidate

    for mi, metric in enumerate(metric_names):
        ms = _slug(metric)
        out.append((uniq(f"{ms}_base_case"), mi, "base"))
        for sc in scenarios:
            ss = _slug(sc.get("name") or "") or _slug(sc["id"])
            out.append((uniq(f"{ms}_{ss}"), mi, sc["id"]))
    return out


def _build_waterfall(rows: List[dict]) -> List[dict]:
    """
    Turn a section table into waterfall bars.
    First metric = starting (base) bar, last metric = total bar (when 2+ metrics),
    everything in between = impact bars coloured by sign.
    """
    n = len(rows)
    items: List[dict] = []
    for i, row in enumerate(rows):
        value = row["value"]
        if i == 0:
            kind = "base"
        elif i == n - 1:
            kind = "total"
        else:
            kind = "positive" if value >= 0 else "negative"
        items.append({"label": row["metric"], "value": value, "type": kind})
    return items


def compute_scenario_tables(config_data: dict) -> dict:
    """
    Main computation function.

    Pipeline
      Stage 3  derived metrics        → Table 1 (metrics × base case + scenarios)
      Stage 5  weighted metrics       → Table 2 (same shape; formulas use Table 1 variables only)
      Stage 7  section tables 3–6     → single value per metric (formulas use Table 2 variables only)
      Waterfalls are built from the four section tables.

    Each scenario's variable set is built as:
        base variables → scenario overrides → scenario-only variables
    and is visible ONLY to that scenario's calculations.

    A derived metric may only use base variables, its scenario's own variables,
    and derived metrics listed ABOVE it (they are evaluated top to bottom).

    Returns: {
        baseCase, scenarioResults,
        table1: [{metric, baseCase, scenarios}],
        table2: [{metric, baseCase, scenarios}],      # weighted table ("<metric> wghtd")
        sectionTables: {stress|shock|opportunity|combined: [{metric, value}]},
        waterfalls:    {stress|shock|opportunity|combined: [{label, value, type}]},
        displayMetrics, errors,
    }
    """
    global_vars = config_data.get("global_variables", [])
    derived_metrics = config_data.get("derived_metrics", [])
    scenarios = config_data.get("scenarios", [])
    table_config = config_data.get("table_config", {}) or {}

    errors: List[str] = []

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
            errors.append(
                f"Step 3 · Derived Metrics — '{dm.get('name', name)}' (Base Case): {_friendly(e)}"
            )
            base_derived[name] = 0.0
            engine.variables[name] = 0.0

    base_all = {**base_vars, **base_derived}

    # ── 3. Compute each scenario ──
    scenario_results: Dict[str, Dict[str, float]] = {}

    for sc in scenarios:
        sc_id = sc["id"]
        sc_name = sc.get("name", sc_id)

        # Start with base variables, apply overrides (overwrite base values for this scenario only)
        sc_vars = dict(base_vars)
        for ov in sc.get("overrides", []) or []:
            ov_name = FormulaEngine._normalize_name(ov.get("name", ""))
            if ov_name:
                sc_vars[ov_name] = float(ov["value"])

        # Add scenario-only variables (new variables that exist only in this scenario)
        for sv in sc.get("variables", []) or []:
            sv_name = FormulaEngine._normalize_name(sv.get("name", ""))
            if sv_name:
                sc_vars[sv_name] = float(sv.get("value", 0.0))

        # Compute derived metrics using this scenario's own formula
        sc_engine = FormulaEngine(sc_vars)
        sc_derived: Dict[str, float] = {}

        for dm in derived_metrics:
            name = FormulaEngine._normalize_name(dm["name"])
            # Use this scenario's own formula; fall back to base formula if none set
            formula = (dm.get("scenario_formulas") or {}).get(sc_id) or dm.get("formula", "")
            try:
                val = sc_engine.evaluate(formula)
                sc_derived[name] = val
                sc_engine.variables[name] = val
            except FormulaError as e:
                errors.append(
                    f"Step 3 · Derived Metrics — '{dm.get('name', name)}' for scenario "
                    f"'{sc_name}': {_friendly(e)}"
                )
                sc_derived[name] = 0.0
                sc_engine.variables[name] = 0.0

        # Scenario-specific derived metrics (legacy; no longer created by the UI)
        for sdm in sc.get("derived", []) or []:
            name = FormulaEngine._normalize_name(sdm.get("name", ""))
            formula = sdm.get("formula", "")
            if not name or not formula:
                continue
            try:
                val = sc_engine.evaluate(formula)
                sc_derived[name] = val
                sc_engine.variables[name] = val
            except FormulaError as e:
                errors.append(
                    f"Scenario '{sc_name}' custom '{sdm.get('name', name)}': {_friendly(e)}"
                )
                sc_derived[name] = 0.0
                sc_engine.variables[name] = 0.0

        scenario_results[sc_id] = {**sc_vars, **sc_derived}

    # ── 4. Table 1: absolute values (every derived metric) ──
    derived_names = [dm["name"].strip() for dm in derived_metrics if (dm.get("name") or "").strip()]

    display_metrics = table_config.get("display_metrics", []) or derived_names

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

    # ── 5. Table 2: weighted metrics (inputs = Table 1 variables only) ──
    stage3_values: Dict[str, float] = {}
    for token, mi, col in _stage_tokens(derived_names, scenarios):
        norm = FormulaEngine._normalize_name(derived_names[mi])
        if col == "base":
            stage3_values[token] = base_all.get(norm, 0.0)
        else:
            stage3_values[token] = scenario_results.get(col, {}).get(norm, 0.0)

    engine3 = FormulaEngine(stage3_values)

    weighted_cfg = table_config.get("weighted_metrics", []) or []
    weighted_by_source = {
        FormulaEngine._normalize_name(w.get("source", "")): w for w in weighted_cfg
    }

    weighted_names = [f"{n} wghtd" for n in derived_names]
    weighted_base: Dict[str, float] = {}
    weighted_scn: Dict[str, Dict[str, float]] = {sc["id"]: {} for sc in scenarios}

    for src, wname in zip(derived_names, weighted_names):
        w = weighted_by_source.get(FormulaEngine._normalize_name(src))
        if w is None:
            errors.append(f"Step 5 · Weighted Table — '{wname}': no formulas defined yet")
            weighted_base[wname] = 0.0
            for sc in scenarios:
                weighted_scn[sc["id"]][wname] = 0.0
            continue

        try:
            weighted_base[wname] = engine3.evaluate(w.get("formula", ""))
        except FormulaError as e:
            errors.append(f"Step 5 · Weighted Table — '{wname}' (Base Case): {_friendly(e)}")
            weighted_base[wname] = 0.0

        for sc in scenarios:
            sc_id = sc["id"]
            sc_name = sc.get("name", sc_id)
            formula = (w.get("scenario_formulas") or {}).get(sc_id, "")
            try:
                weighted_scn[sc_id][wname] = engine3.evaluate(formula)
            except FormulaError as e:
                errors.append(
                    f"Step 5 · Weighted Table — '{wname}' for scenario '{sc_name}': {_friendly(e)}"
                )
                weighted_scn[sc_id][wname] = 0.0

    table2_rows = []
    for wname in weighted_names:
        table2_rows.append({
            "metric": wname,
            "baseCase": weighted_base.get(wname, 0.0),
            "scenarios": {sc["id"]: weighted_scn[sc["id"]].get(wname, 0.0) for sc in scenarios},
        })

    # ── 6. Section tables 3–6 (inputs = Table 2 variables only) ──
    stage5_values: Dict[str, float] = {}
    for token, mi, col in _stage_tokens(weighted_names, scenarios):
        wname = weighted_names[mi]
        if col == "base":
            stage5_values[token] = weighted_base.get(wname, 0.0)
        else:
            stage5_values[token] = weighted_scn.get(col, {}).get(wname, 0.0)

    engine5 = FormulaEngine(stage5_values)

    section_cfg = table_config.get("section_tables", {}) or {}
    section_tables: Dict[str, List[dict]] = {}
    waterfalls: Dict[str, List[dict]] = {}

    for key in SECTION_KEYS:
        rows: List[dict] = []
        for m in section_cfg.get(key, []) or []:
            mname = (m.get("name") or "").strip() or "Metric"
            try:
                val = engine5.evaluate(m.get("formula", ""))
            except FormulaError as e:
                errors.append(
                    f"Step 7 · Section Tables — {SECTION_TITLES.get(key, key)} › "
                    f"'{mname}': {_friendly(e)}"
                )
                val = 0.0
            rows.append({"metric": mname, "value": val})
        section_tables[key] = rows
        waterfalls[key] = _build_waterfall(rows)

    return {
        "baseCase": base_all,
        "scenarioResults": scenario_results,
        "table1": table1_rows,
        "table2": table2_rows,
        "sectionTables": section_tables,
        "waterfalls": waterfalls,
        "displayMetrics": display_metrics,
        "errors": errors,
    }
