import httpx
import json

BASE_URL = 'http://localhost:8000'

try:
    # 1. Test AI Brain (Health)
    res_h = httpx.get(f'{BASE_URL}/health')
    print(f'AI Health: {res_h.status_code} - {res_h.json()["status"]}')

    # 2. Test AI Thought (Embedding)
    res_e = httpx.post(f'{BASE_URL}/embed', json={'text': 'Artificial Intelligence'})
    emb = res_e.json()['embedding']
    print(f'AI Embedding: {len(emb)} dimensions generated.')

    # 3. Test AI Logic (Similarity)
    # Finding the user ID for ai-test@quitio.com first
    import psycopg
    from config import DATABASE_URL
    
    if not DATABASE_URL:
        raise Exception("DATABASE_URL environment variable is not set")

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = 'ai-test@quitio.com'")
            row = cur.fetchone()
            if not row:
                raise Exception("Test user 'ai-test@quitio.com' not found. Run verification after creating the test account.")
            user_id = str(row[0])

    payload = {
        'query': 'feline',
        'user_id': user_id,
        'top_k': 1
    }
    res_s = httpx.post(f'{BASE_URL}/search/vector', json=payload, timeout=60.0)
    results = res_s.json()['results']
    print(f'AI Search: Found "{results[0]["title"]}" for "feline"')

    print('\nRESULT: ALL AI PHASES (19-22) ARE FULLY OPERATIONAL!')
except Exception as e:
    print(f'Verification Failed: {e}')
