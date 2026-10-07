"""
Unit tests for Graph-RAG Semantic Topology & Knowledge Network Agent.
"""
import pytest

from services.agents.graph_rag_agent import (
    GraphTopologyResponse,
    graph_rag_agent,
)


@pytest.mark.anyio
async def test_graph_rag_topology_generation():
    res: GraphTopologyResponse = await graph_rag_agent.get_network_topology()
    assert res.total_nodes >= 5
    assert res.total_edges >= 5
    assert "Students" in res.domains_covered
    assert "Mentors" in res.domains_covered

@pytest.mark.anyio
async def test_graph_rag_topology_filtered():
    res: GraphTopologyResponse = await graph_rag_agent.get_network_topology(query="Google")
    assert len(res.nodes) >= 1
    assert any("google" in n.label.lower() for n in res.nodes)
