import psycopg
import os
import json
from dotenv import load_dotenv
load_dotenv()

def check_metadata():
    db_url = os.getenv('DATABASE_URL')
    try:
        conn = psycopg.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT title, semantic_metadata FROM cards WHERE semantic_metadata IS NOT NULL LIMIT 5")
        rows = cur.fetchall()
        with open("scratch/enrichment_results.txt", "w", encoding="utf-8") as f:
            f.write(f"Found {len(rows)} enriched cards.\n\n")
            for row in rows:
                f.write(f"Title: {row[0]}\n")
                f.write(f"Metadata: {json.dumps(row[1], indent=2)}\n")
                f.write("-" * 20 + "\n")
        print("Results written to scratch/enrichment_results.txt")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_metadata()
