import re

input_path = r'c:/Users/code4/Desktop/medusa/restore.sql'
output_path = r'c:/Users/code4/Desktop/medusa/restore_final.sql'

with open(input_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the CHECK (CHECK (...)) issue
cleaned_content = re.sub(r'CHECK \(CHECK \((.*?)\)\)', r'CHECK (\1)', content)

# Remove the markdown backticks
cleaned_content = cleaned_content.replace('```', '')

# Add DROP SCHEMA statements at the beginning to ensure a clean restore
# This will clear the empty session tables and restore your Medusa tables
prepend_sql = """
DROP SCHEMA IF EXISTS "public" CASCADE;
DROP SCHEMA IF EXISTS "neon_auth" CASCADE;
CREATE SCHEMA "public";
CREATE SCHEMA "neon_auth";
"""

final_content = prepend_sql + cleaned_content

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("SQL prepared for clean restore.")
