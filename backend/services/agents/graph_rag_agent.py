"""
services.agents.graph_rag_agent — Graph-RAG Semantic Topology & Knowledge Network Agent.

Builds a deterministic knowledge graph topology (nodes + edges) across the
domains of the platform and supports label filtering.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    label: str
    domain: str


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str


class GraphTopologyResponse(BaseModel):
    total_nodes: int = 0
    total_edges: int = 0
    domains_covered: List[str] = Field(default_factory=list)
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)


class GraphRAGAgent:
    def _build(self) -> GraphTopologyResponse:
        nodes = [
            GraphNode(id="n-student", label="Students", domain="Students"),
            GraphNode(id="n-mentor", label="Mentors", domain="Mentors"),
            GraphNode(id="n-alumni", label="Alumni", domain="Alumni"),
            GraphNode(id="n-google", label="Google", domain="Companies"),
            GraphNode(id="n-jobs", label="Jobs", domain="Jobs"),
        ]
        edges = [
            GraphEdge(source="n-student", target="n-mentor", relationship="matches_with"),
            GraphEdge(source="n-mentor", target="n-alumni", relationship="mentored_by"),
            GraphEdge(source="n-alumni", target="n-google", relationship="works_at"),
            GraphEdge(source="n-student", target="n-jobs", relationship="applies_to"),
            GraphEdge(source="n-jobs", target="n-google", relationship="posted_by"),
        ]
        return GraphTopologyResponse(
            total_nodes=len(nodes),
            total_edges=len(edges),
            domains_covered=["Students", "Mentors", "Alumni", "Companies", "Jobs"],
            nodes=nodes,
            edges=edges,
        )

    async def get_network_topology(self, query: Optional[str] = None) -> GraphTopologyResponse:
        topo = self._build()
        if query:
            q = query.lower()
            topo.nodes = [n for n in topo.nodes if q in n.label.lower()]
        return topo


graph_rag_agent = GraphRAGAgent()
