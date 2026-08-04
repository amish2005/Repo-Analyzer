-- 1. Drop the existing RPC functions that depend on older vector dimensions
DROP FUNCTION IF EXISTS match_code_chunks(vector(1536), float, int, uuid);
DROP FUNCTION IF EXISTS match_code_chunks(vector(384), float, int, uuid);

-- 2. Drop the existing index
DROP INDEX IF EXISTS code_embeddings_embedding_idx;

-- 3. Clear existing invalid data (optional, but recommended when changing dimensions)
TRUNCATE TABLE code_embeddings;

-- 4. Alter the column to the new 768 dimensions used by Google Gemini Embeddings
ALTER TABLE code_embeddings ALTER COLUMN embedding TYPE vector(768);

-- 5. Recreate the index for the new 768-dimension vectors
CREATE INDEX ON code_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 6. Recreate the RPC function for 768 dimensions
create or replace function match_code_chunks (
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    p_project_id uuid
)
returns table (
    id uuid,
    file_path text,
    content text,
    metadata jsonb,
    similarity float
)
language sql stable
as $$
    select
        code_embeddings.id,
        code_embeddings.file_path,
        code_embeddings.content,
        code_embeddings.metadata,
        1 - (code_embeddings.embedding <=> query_embedding) as similarity
    from code_embeddings
    where 1 - (code_embeddings.embedding <=> query_embedding) > match_threshold
      and code_embeddings.project_id = p_project_id
    order by code_embeddings.embedding <=> query_embedding
    limit match_count;
$$;
