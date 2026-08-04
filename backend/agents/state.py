from typing import TypedDict, Dict, Any, List
import operator
from typing import Annotated

class CodebaseState(TypedDict):
    """
    Shared state for the LangGraph agent workflow.
    Tracks repository data, granular worker outputs, and finalized reports.
    """
    repo_url: str
    repo_path: str
    file_tree: Dict[str, Any]
    code_chunks: List[Dict[str, str]]
    
    # operator.ior allows parallel nodes to merge their dictionary outputs together
    # instead of overwriting the state key.
    agent_outputs: Annotated[Dict[str, Any], operator.ior]
    
    tab_reports: Annotated[Dict[str, Any], operator.ior]
    final_markdown: str
