"""
Scenario Builder — Excel import / template for Global & Base Case Variables.

Expected sheet layout (first sheet, header row anywhere in the first 20 rows):

    variable_name | value | description
    revenue       | 1250  | FY revenue in GHS M
    opex          | 430   | (optional)

Header matching is case-insensitive and ignores spaces / dashes, so
"Variable Name", "variable-name" and "VARIABLE_NAME" all work.
"""
from __future__ import annotations

import csv
import io
import re
from typing import Any

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

COLUMNS = ["variable_name", "value", "description"]
REQUIRED = ["variable_name", "value"]
MAX_ROWS = 1000
MAX_BYTES = 5 * 1024 * 1024
HEADER_SEARCH_ROWS = 20
ALLOWED_EXTENSIONS = (".xlsx", ".xlsm", ".csv")


class ExcelImportError(ValueError):
    """Raised when the file cannot be used at all (wrong type, missing columns, ...)."""


def _norm_header(value: Any) -> str:
    return re.sub(r"[\s\-]+", "_", str(value or "").strip().lower())


def _parse_value(raw: Any) -> float:
    """Accept numbers and numeric text like '1,250', ' 3.5 ', '12%' (→ 0.12), '(40)' (→ -40)."""
    if isinstance(raw, bool):
        raise ValueError("true/false is not a number")
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().replace(",", "").replace(" ", "")
    if not text:
        raise ValueError("value is empty")
    negative = text.startswith("(") and text.endswith(")")
    if negative:
        text = text[1:-1]
    percent = text.endswith("%")
    if percent:
        text = text[:-1]
    number = float(text)          # raises ValueError for non-numeric text
    if percent:
        number /= 100
    return -number if negative else number


def _read_rows(filename: str, content: bytes) -> list[list[Any]]:
    if filename.lower().endswith(".csv"):
        text = content.decode("utf-8-sig", errors="replace")
        return [row for row in csv.reader(io.StringIO(text))]
    try:
        wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001
        raise ExcelImportError(
            "The file could not be opened as an Excel workbook. Save it as .xlsx and try again."
        ) from exc
    ws = wb["Variables"] if "Variables" in wb.sheetnames else wb.worksheets[0]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    wb.close()
    return rows


def parse_variables_file(filename: str, content: bytes) -> dict:
    """
    Parse an uploaded workbook into Scenario Builder variables.

    Returns {"variables": [{name, value, description}], "warnings": [str], "skipped": int}.
    Bad rows are skipped with a warning; the whole file is rejected only when it
    is unusable (wrong type, no header, nothing valid).
    """
    if not filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise ExcelImportError("Please upload an .xlsx file (or .csv). Older .xls files must be re-saved as .xlsx.")
    if len(content) > MAX_BYTES:
        raise ExcelImportError("The file is larger than 5 MB.")
    if not content:
        raise ExcelImportError("The file is empty.")

    rows = _read_rows(filename, content)

    # Locate the header row
    header_idx, col_index = None, {}
    for i, row in enumerate(rows[:HEADER_SEARCH_ROWS]):
        names = [_norm_header(c) for c in row]
        if all(req in names for req in REQUIRED):
            header_idx = i
            col_index = {col: names.index(col) for col in COLUMNS if col in names}
            break
    if header_idx is None:
        raise ExcelImportError(
            "Could not find the header row. The sheet needs the columns "
            "variable_name, value and description (download the template to get them exactly)."
        )

    variables: list[dict] = []
    warnings: list[str] = []
    seen: set[str] = set()
    skipped = 0

    def cell(row: list[Any], col: str) -> Any:
        idx = col_index.get(col)
        return row[idx] if idx is not None and idx < len(row) else None

    for offset, row in enumerate(rows[header_idx + 1:], start=header_idx + 2):
        name_raw, value_raw, desc_raw = cell(row, "variable_name"), cell(row, "value"), cell(row, "description")
        if all(v is None or str(v).strip() == "" for v in (name_raw, value_raw, desc_raw)):
            continue  # blank row

        name = str(name_raw or "").strip()
        if not name:
            warnings.append(f"Row {offset}: skipped — variable_name is empty.")
            skipped += 1
            continue
        try:
            value = _parse_value(value_raw if value_raw is not None else "")
        except ValueError:
            warnings.append(f"Row {offset}: skipped '{name}' — value '{value_raw}' is not a number.")
            skipped += 1
            continue
        key = name.lower()
        if key in seen:
            warnings.append(f"Row {offset}: skipped '{name}' — duplicate variable name.")
            skipped += 1
            continue
        seen.add(key)
        variables.append({
            "name": name,
            "value": value,
            "description": str(desc_raw).strip() if desc_raw is not None else "",
        })
        if len(variables) >= MAX_ROWS:
            warnings.append(f"Only the first {MAX_ROWS} variables were imported.")
            break

    if not variables:
        raise ExcelImportError(
            "No valid variables were found under the header row."
            + (f" {warnings[0]}" if warnings else "")
        )
    return {"variables": variables, "warnings": warnings, "skipped": skipped}


def build_template() -> bytes:
    """Return the .xlsx template: a 'Variables' sheet with the headers + an 'Instructions' sheet."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Variables"
    ws.append(COLUMNS)

    header_fill = PatternFill("solid", fgColor="FFCC00")
    for c in ws[1]:
        c.font = Font(bold=True, color="000000")
        c.fill = header_fill
        c.alignment = Alignment(horizontal="center")
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 60
    ws.freeze_panes = "A2"

    dv = DataValidation(
        type="decimal", operator="between", formula1="-1E+15", formula2="1E+15",
        showErrorMessage=True, errorTitle="Number required",
        error="The value column must contain a number.",
    )
    ws.add_data_validation(dv)
    dv.add(f"B2:B{MAX_ROWS + 1}")

    guide = wb.create_sheet("Instructions")
    lines = [
        ("How to fill in this template", True),
        ("1. Fill in the 'Variables' sheet — one variable per row, starting on row 2.", False),
        ("2. Do not rename, reorder or delete the header row (variable_name, value, description).", False),
        ("3. variable_name: letters, numbers and underscores; start with a letter (e.g. revenue, opex_2025).", False),
        ("   Names must be unique. Spaces are turned into underscores in formulas.", False),
        ("4. value: a plain number (1250, -40, 0.12). Commas and % are accepted (12% is read as 0.12).", False),
        ("5. description: optional free text.", False),
        ("6. Save as .xlsx and use 'Upload Excel' in the Scenario Builder (Step 1 — Variables).", False),
        ("", False),
        ("Example rows (type yours on the Variables sheet, not here):", True),
    ]
    for text, bold in lines:
        guide.append([text])
        if bold:
            guide.cell(row=guide.max_row, column=1).font = Font(bold=True)
    guide.append([])
    guide.append(COLUMNS)
    for c in guide[guide.max_row]:
        c.font = Font(bold=True)
    for example in (["revenue", 1250, "FY revenue (GHS M)"],
                    ["opex", 430, "Operating expenses (GHS M)"],
                    ["fx_rate", 15.2, "GHS per USD"]):
        guide.append(example)
    guide.column_dimensions["A"].width = 95
    guide.column_dimensions["B"].width = 12
    guide.column_dimensions["C"].width = 30

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
