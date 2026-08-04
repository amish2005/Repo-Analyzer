import os
import re

target_dir = r"c:\Users\Amish\Coding\PROJECTS\Agentic AI\frontend\src\app\dashboard"

for root, _, files in os.walk(target_dir):
    for file in files:
        if file.endswith(".tsx"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            if 'useSearchParams' in content and 'Suspense' not in content:
                print(f"Fixing {file_path}")    
                
                # Find export default function XYZ(props) {
                match = re.search(r'export default function\s+([A-Za-z0-9_]+)\s*\((.*?)\)\s*{', content)
                if match:
                    func_name = match.group(1)
                    
                    # Rename to Content
                    content = content[:match.start()] + f"function {func_name}Content({match.group(2)}) {{" + content[match.end():]
                    
                    # Add Suspense wrapper at the end
                    wrapper = f"""

import {{ Suspense }} from "react";

export default function {func_name}() {{
  return (
    <Suspense fallback={{<div className="flex items-center justify-center h-screen bg-black text-zinc-500">Loading...</div>}}>
      <{func_name}Content />
    </Suspense>
  );
}}
"""
                    content += wrapper
                    
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(content)

print("Done fixing suspense.")
