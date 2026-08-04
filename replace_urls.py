import os
import re

target_dir = r"c:\Users\Amish\Coding\PROJECTS\Agentic AI\frontend\src"
search_pattern = r"http://localhost:8000/api"
replace_pattern = r"${API_BASE}"
import_statement = 'import { API_BASE } from "@/utils/api";\n'

for root, _, files in os.walk(target_dir):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            file_path = os.path.join(root, file)
            # Skip api.ts itself
            if file == "api.ts":
                continue
            
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            if search_pattern in content:
                print(f"Modifying {file_path}...")
                
                # Replace URLs
                content = content.replace(search_pattern, replace_pattern)
                
                # Add import if missing
                if 'import { API_BASE }' not in content and 'import { analyzeRepo, API_BASE }' not in content:
                    # check if we can modify an existing api import
                    if 'import { analyzeRepo } from "@/utils/api"' in content:
                        content = content.replace('import { analyzeRepo } from "@/utils/api"', 'import { analyzeRepo, API_BASE } from "@/utils/api"')
                    else:
                        # find the last import and insert after it
                        lines = content.split('\n')
                        last_import = 0
                        for i, line in enumerate(lines):
                            if line.startswith('import '):
                                last_import = i
                        lines.insert(last_import + 1, import_statement.strip())
                        content = '\n'.join(lines)
                        
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)

print("Done replacing.")
