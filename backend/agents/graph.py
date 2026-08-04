from langgraph.graph import StateGraph, START, END
from .state import CodebaseState
from .workers import (
    purpose_worker,
    tech_stack_worker,
    integration_worker,
    architecture_worker,
    database_schema_worker,
    auth_flow_worker,
    dependency_audit_worker
)
from .supervisors import (
    overview_supervisor,
    architecture_supervisor,
    database_supervisor,
    auth_supervisor,
    dependency_supervisor,
    master_supervisor
)

# Initialize Graph
builder = StateGraph(CodebaseState)

# Add Nodes
builder.add_node("purpose_worker", purpose_worker)
builder.add_node("tech_stack_worker", tech_stack_worker)
builder.add_node("integration_worker", integration_worker)
builder.add_node("architecture_worker", architecture_worker)
builder.add_node("database_schema_worker", database_schema_worker)
builder.add_node("auth_flow_worker", auth_flow_worker)
builder.add_node("dependency_audit_worker", dependency_audit_worker)

builder.add_node("overview_supervisor", overview_supervisor)
builder.add_node("architecture_supervisor", architecture_supervisor)
builder.add_node("database_supervisor", database_supervisor)
builder.add_node("auth_supervisor", auth_supervisor)
builder.add_node("dependency_supervisor", dependency_supervisor)
builder.add_node("master_supervisor", master_supervisor)

# Wire Edges
# 1. Chain workers sequentially to prevent bursting the API rate limit (5-15 RPM)
builder.add_edge(START, "purpose_worker")
builder.add_edge("purpose_worker", "tech_stack_worker")
builder.add_edge("tech_stack_worker", "integration_worker")
builder.add_edge("integration_worker", "architecture_worker")
builder.add_edge("architecture_worker", "database_schema_worker")
builder.add_edge("database_schema_worker", "auth_flow_worker")
builder.add_edge("auth_flow_worker", "dependency_audit_worker")

# 2. Chain supervisors sequentially after workers complete
builder.add_edge("dependency_audit_worker", "overview_supervisor")
builder.add_edge("overview_supervisor", "architecture_supervisor")
builder.add_edge("architecture_supervisor", "database_supervisor")
builder.add_edge("database_supervisor", "auth_supervisor")
builder.add_edge("auth_supervisor", "dependency_supervisor")
builder.add_edge("dependency_supervisor", "master_supervisor")

builder.add_edge("master_supervisor", END)

# Compile Graph
repo_macro_agent_app = builder.compile()
