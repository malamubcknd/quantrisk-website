# backend/app/api/scenario_builder_routes.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.models.database import SessionLocal
from app.models.scenario_builder import ScenarioConfig, ScenarioSnapshot
from app.services.formula_engine import (
    validate_formula,
    compute_scenario_tables,
    FormulaEngine,
)

router = APIRouter(prefix="/api/scenario-builder", tags=["scenario-builder"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────

class VariableItem(BaseModel):
    name: str
    value: float
    description: str = ""

class DerivedItem(BaseModel):
    name: str
    formula: str
    description: str = ""

class ScenarioOverride(BaseModel):
    name: str
    value: float

class ScenarioDerived(BaseModel):
    name: str
    formula: str

class ScenarioItem(BaseModel):
    id: str
    name: str
    type: str                            # stress | shock | opportunity
    overrides: List[ScenarioOverride] = []
    derived: List[ScenarioDerived] = []

class TableConfigSchema(BaseModel):
    display_metrics: List[str] = []
    waterfall_metrics: List[str] = []
    weights: Dict[str, float] = {"stress": 0.7, "shock": 0.3, "opportunity": 1.0}

class CreateConfigRequest(BaseModel):
    name: str
    year: int
    description: str = ""
    currency_label: str = "GHS M"
    global_variables: List[VariableItem]
    derived_metrics: List[DerivedItem]
    scenarios: List[ScenarioItem]
    table_config: Optional[TableConfigSchema] = None

class UpdateConfigRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    currency_label: Optional[str] = None
    global_variables: Optional[List[VariableItem]] = None
    derived_metrics: Optional[List[DerivedItem]] = None
    scenarios: Optional[List[ScenarioItem]] = None
    table_config: Optional[TableConfigSchema] = None

class FormulaValidateRequest(BaseModel):
    formula: str
    available_variables: List[str]

class ComputeRequest(BaseModel):
    notes: str = ""


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/configs")
def list_configs(year: Optional[int] = None):
    """List all scenario configurations, optionally filtered by year."""
    with SessionLocal() as db:
        query = db.query(ScenarioConfig).order_by(ScenarioConfig.year.desc(), ScenarioConfig.updated_at.desc())
        if year:
            query = query.filter(ScenarioConfig.year == year)
        configs = query.all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "year": c.year,
                "description": c.description,
                "status": c.status,
                "currency_label": c.currency_label,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "computed_at": c.computed_at.isoformat() if c.computed_at else None,
                "snapshot_count": len(c.snapshots),
            }
            for c in configs
        ]


@router.post("/configs")
def create_config(req: CreateConfigRequest):
    """Create a new scenario configuration."""
    with SessionLocal() as db:
        config = ScenarioConfig(
            name=req.name,
            year=req.year,
            description=req.description,
            currency_label=req.currency_label,
            global_variables=[v.dict() for v in req.global_variables],
            derived_metrics=[d.dict() for d in req.derived_metrics],
            scenarios=[s.dict() for s in req.scenarios],
            table_config=req.table_config.dict() if req.table_config else None,
            status="draft",
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return {"id": config.id, "message": "Configuration created"}


@router.get("/configs/{config_id}")
def get_config(config_id: int):
    """Get full configuration details."""
    with SessionLocal() as db:
        config = db.query(ScenarioConfig).filter(ScenarioConfig.id == config_id).first()
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        return {
            "id": config.id,
            "name": config.name,
            "year": config.year,
            "description": config.description,
            "status": config.status,
            "currency_label": config.currency_label,
            "global_variables": config.global_variables,
            "derived_metrics": config.derived_metrics,
            "scenarios": config.scenarios,
            "table_config": config.table_config,
            "computed_results": config.computed_results,
            "created_at": config.created_at.isoformat() if config.created_at else None,
            "updated_at": config.updated_at.isoformat() if config.updated_at else None,
            "computed_at": config.computed_at.isoformat() if config.computed_at else None,
        }


@router.put("/configs/{config_id}")
def update_config(config_id: int, req: UpdateConfigRequest):
    """Update a configuration (partial update)."""
    with SessionLocal() as db:
        config = db.query(ScenarioConfig).filter(ScenarioConfig.id == config_id).first()
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")

        if req.name is not None:
            config.name = req.name
        if req.description is not None:
            config.description = req.description
        if req.currency_label is not None:
            config.currency_label = req.currency_label
        if req.global_variables is not None:
            config.global_variables = [v.dict() for v in req.global_variables]
        if req.derived_metrics is not None:
            config.derived_metrics = [d.dict() for d in req.derived_metrics]
        if req.scenarios is not None:
            config.scenarios = [s.dict() for s in req.scenarios]
        if req.table_config is not None:
            config.table_config = req.table_config.dict()

        config.status = "draft"  # Reset to draft on edit
        db.commit()
        return {"message": "Configuration updated"}


@router.delete("/configs/{config_id}")
def delete_config(config_id: int):
    """Delete a configuration and all its snapshots."""
    with SessionLocal() as db:
        config = db.query(ScenarioConfig).filter(ScenarioConfig.id == config_id).first()
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        db.delete(config)
        db.commit()
        return {"message": "Configuration deleted"}


@router.post("/configs/{config_id}/compute")
def compute_config(config_id: int, req: ComputeRequest):
    """
    Run all calculations for a configuration.
    Saves results to the config and creates an immutable snapshot.
    """
    with SessionLocal() as db:
        config = db.query(ScenarioConfig).filter(ScenarioConfig.id == config_id).first()
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")

        # Build the config data dict
        config_data = {
            "global_variables": config.global_variables,
            "derived_metrics": config.derived_metrics,
            "scenarios": config.scenarios,
            "table_config": config.table_config or {},
        }

        try:
            results = compute_scenario_tables(config_data)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Computation failed: {str(e)}")

        # Save results to config
        config.computed_results = results
        config.status = "computed"
        config.computed_at = datetime.utcnow()

        # Create snapshot
        snapshot_count = db.query(ScenarioSnapshot).filter(
            ScenarioSnapshot.config_id == config_id
        ).count()

        snapshot = ScenarioSnapshot(
            config_id=config_id,
            version=snapshot_count + 1,
            snapshot_data={
                "inputs": config_data,
                "results": results,
                "computed_at": datetime.utcnow().isoformat(),
            },
            notes=req.notes or f"Computation v{snapshot_count + 1}",
        )
        db.add(snapshot)
        db.commit()

        return {
            "message": "Computation complete",
            "snapshot_version": snapshot_count + 1,
            "results": results,
        }


@router.get("/configs/{config_id}/snapshots")
def list_snapshots(config_id: int):
    """List all computation snapshots for a configuration."""
    with SessionLocal() as db:
        snapshots = (
            db.query(ScenarioSnapshot)
            .filter(ScenarioSnapshot.config_id == config_id)
            .order_by(ScenarioSnapshot.version.desc())
            .all()
        )
        return [
            {
                "id": s.id,
                "version": s.version,
                "notes": s.notes,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in snapshots
        ]


@router.get("/configs/{config_id}/snapshots/{snapshot_id}")
def get_snapshot(config_id: int, snapshot_id: int):
    """Get a specific snapshot's full data."""
    with SessionLocal() as db:
        snapshot = (
            db.query(ScenarioSnapshot)
            .filter(ScenarioSnapshot.config_id == config_id, ScenarioSnapshot.id == snapshot_id)
            .first()
        )
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        return {
            "id": snapshot.id,
            "version": snapshot.version,
            "notes": snapshot.notes,
            "data": snapshot.snapshot_data,
            "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
        }


@router.post("/validate-formula")
def validate_formula_endpoint(req: FormulaValidateRequest):
    """Validate a formula against available variables."""
    error = validate_formula(req.formula, req.available_variables)
    if error:
        return {"valid": False, "error": error}
    return {"valid": True, "error": None}


@router.post("/configs/{config_id}/duplicate")
def duplicate_config(config_id: int, new_name: str = "", new_year: Optional[int] = None):
    """Duplicate a configuration (for next year's starting point)."""
    with SessionLocal() as db:
        original = db.query(ScenarioConfig).filter(ScenarioConfig.id == config_id).first()
        if not original:
            raise HTTPException(status_code=404, detail="Configuration not found")

        dup = ScenarioConfig(
            name=new_name or f"{original.name} (Copy)",
            year=new_year or original.year + 1,
            description=original.description,
            currency_label=original.currency_label,
            global_variables=original.global_variables,
            derived_metrics=original.derived_metrics,
            scenarios=original.scenarios,
            table_config=original.table_config,
            status="draft",
        )
        db.add(dup)
        db.commit()
        db.refresh(dup)
        return {"id": dup.id, "message": f"Duplicated as '{dup.name}' for year {dup.year}"}