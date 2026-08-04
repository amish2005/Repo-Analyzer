import os
import shutil
import tempfile
import subprocess
from pathlib import Path

IGNORE_DIRS = {'.git', 'node_modules', 'venv', '__pycache__', '.next', 'dist', 'build'}
IGNORE_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pyc', '.pdf', '.zip', '.tar', '.gz'}

def clone_and_parse_repo(github_url: str):
    """
    Clones a GitHub repository to a temporary directory,
    extracts the file tree, and extracts code chunks.
    """
    temp_dir = tempfile.mkdtemp()
    try:
        # Clone the repository
        print(f"Cloning {github_url} into {temp_dir}...")
        subprocess.run(
            ['git', 'clone', '--depth', '1', github_url, temp_dir],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        file_tree = {"name": os.path.basename(github_url.rstrip("/")), "type": "directory", "children": []}
        code_chunks = []
        
        def walk_dir(current_path, tree_node):
            entries = sorted(os.listdir(current_path))
            for entry in entries:
                if entry in IGNORE_DIRS:
                    continue
                
                full_path = os.path.join(current_path, entry)
                rel_path = os.path.relpath(full_path, temp_dir)
                
                if os.path.isdir(full_path):
                    dir_node = {"name": entry, "type": "directory", "children": []}
                    tree_node["children"].append(dir_node)
                    walk_dir(full_path, dir_node)
                else:
                    _, ext = os.path.splitext(entry)
                    if ext.lower() in IGNORE_EXTS:
                        continue
                        
                    file_node = {"name": entry, "type": "file", "path": rel_path}
                    tree_node["children"].append(file_node)
                    
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            if content.strip():
                                code_chunks.append({
                                    "file_path": rel_path,
                                    "content": content
                                })
                    except UnicodeDecodeError:
                        # Skip binary files that don't match IGNORE_EXTS
                        pass

        walk_dir(temp_dir, file_tree)
        
        return {
            "file_tree": file_tree,
            "code_chunks": code_chunks,
            "local_path": temp_dir
        }
        
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise e
