import logging
from services.db_service import DBService
from services.vector_store import VectorStore
from services.graph_store import GraphStore
from services.graph_builder import GraphBuilder

logging.basicConfig(level=logging.INFO)

db = DBService()
vs = VectorStore(db)
gs = GraphStore(db)
gb = GraphBuilder(vs, gs)

user_id = '78f8a0c1-c308-4afa-837d-fe16344b4bfb'
print(f"Building graph for user {user_id}...")
n_edges = gb.build_user_graph(user_id, semantic_threshold=0.5)
print(f"Build complete. Created {n_edges} edges.")
