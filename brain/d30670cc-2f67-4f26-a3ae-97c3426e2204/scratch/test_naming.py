import sys
import os
from collections import Counter
import re
import numpy as np

# Mocking parts of the environment
def clean_text_for_keywords(text: str):
    if not text: return []
    text = text.lower()
    text = re.sub(r'\S+@\S+', ' ', text)
    text = re.sub(r'\+?\d[\d\-\s]{7,}\d', ' ', text)
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
    text = re.sub(r'\b[0-9a-f]{8,}\b', ' ', text)
    text = re.sub(r'\b\d{5,}\b', ' ', text)
    tokens = re.findall(r'\b[a-z]{3,}\b', text)
    STOPWORDS = {"the", "and", "for", "with", "from", "that", "this", "these", "those"}
    return [t for t in tokens if t not in STOPWORDS]

def extract_tfidf_name(community_cids, card_map, corpus_freq, total_word_count):
    cluster_words = []
    full_text_blob = ""
    for cid in community_cids:
        card = card_map[cid]
        title = card.get("title", "")
        text = card.get("extracted_text", "") or ""
        is_generic_title = bool(re.search(r'file-\d+|untitled|document\d*', title.lower()))
        if not is_generic_title:
            title_tokens = clean_text_for_keywords(title)
            cluster_words.extend(title_tokens * 3)
        content_tokens = clean_text_for_keywords(text[:2000])
        cluster_words.extend(content_tokens)
        full_text_blob += " " + text.lower()

    heuristics = [
        (r"\b(resume|cv|curriculum vitae)\b", "Resumes"),
        (r"\b(exam|paper|question)\b", "Exams"),
    ]
    heuristic_counts = Counter()
    for pattern, label in heuristics:
        matches = len(re.findall(pattern, full_text_blob))
        if matches > 0: heuristic_counts[label] = matches
    if heuristic_counts:
        top_heuristic, count = heuristic_counts.most_common(1)[0]
        if count >= len(community_cids) * 1.5: return top_heuristic

    if not cluster_words: return "Mixed Documents"
    cluster_freq = Counter(cluster_words)
    word_scores = {}
    for word, count in cluster_freq.items():
        idf = np.log((total_word_count + 1) / (corpus_freq.get(word, 0) + 1))
        word_scores[word] = count * idf
    top_keywords = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)
    if top_keywords:
        k1 = top_keywords[0][0].capitalize()
        if len(top_keywords) > 1 and top_keywords[1][1] > top_keywords[0][1] * 0.6:
            k2 = top_keywords[1][0].capitalize()
            return f"{k1} & {k2}"
        return k1
    return "Mixed Documents"

# Test Data
card_map = {
    "1": {"title": "Resume_Suresh.pdf", "extracted_text": "Suresh Jakhar Resume Software Engineer Experience with Python and Machine Learning"},
    "2": {"title": "CV_New.docx", "extracted_text": "Curriculum Vitae for Suresh. Skills include NLP and Backend Engineering."},
    "3": {"title": "file-12345", "extracted_text": "Experience in full stack development. Resume details below."}
}
comm = {"1", "2", "3"}
corpus_freq = Counter(["python", "ml", "nlp", "software", "engineer", "experience"])
total_word_count = 100

print("Test Result:", extract_tfidf_name(comm, card_map, corpus_freq, total_word_count))
