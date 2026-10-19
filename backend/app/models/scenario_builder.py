# backend/app/models/scenario_builder.py

from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON, ForeignKey, func
from sqlalchemy.orm import relationship
from app.models.database import Base


class ScenarioConfig(Base):
    """
    A complete scenario-builder configuration (one per year/version).
    Stores everything: variables, formulas, scenarios, table definitions.
    """
    __tablename__ = "scenario_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)              # e.g. "FY2025 Stress Test"
    year = Column(Integer, nullable=False)                   # e.g. 2025
    description = Column(Text, nullable=True)
    status = Column(String(50), default="draft")             # draft | computed | archived
    currency_label = Column(String(20), default="GHS M")     # display unit

    # ── Core definitions (stored as JSON) ──
    global_variables = Column(JSON, nullable=False)          # [{name, value, description}]
    derived_metrics = Column(JSON, nullable=False)           # [{name, formula, description}]
    scenarios = Column(JSON, nullable=False)                 # [{id, name, type, overrides, derived}]
    table_config = Column(JSON, nullable=True)               # {metrics, weights, tableDefinitions}

    # ── Computed results (populated after calculation) ──
    computed_results = Column(JSON, nullable=True)           # {table1, table2, waterfalls, ...}

    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    computed_at = Column(DateTime, nullable=True)

    # Relationship to snapshots for historical tracking
    snapshots = relationship("ScenarioSnapshot", back_populates="config", cascade="all, delete-orphan")


class ScenarioSnapshot(Base):
    """
    Immutable snapshot taken when user clicks 'Calculate'.
    Preserves exact inputs + outputs for audit trail.
    """
    __tablename__ = "scenario_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, ForeignKey("scenario_configs.id"), nullable=False)
    version = Column(Integer, nullable=False)                # auto-incremented per config
    snapshot_data = Column(JSON, nullable=False)             # full frozen copy of config + results
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    config = relationship("ScenarioConfig", back_populates="snapshots")