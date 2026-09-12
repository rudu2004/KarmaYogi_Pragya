import sqlite3
import json
import os

DB_FILE = "karmayogi.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target_topic TEXT,
        language TEXT DEFAULT 'en',
        current_level TEXT DEFAULT 'Beginner'
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS competency_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        competency_tag TEXT NOT NULL,
        score REAL NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS igot_courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        title_hi TEXT,
        level TEXT CHECK( level IN ('Beginner', 'Intermediate', 'Advanced') ),
        sequence_order INTEGER,
        competency_tag TEXT,
        duration REAL,
        provider TEXT,
        description TEXT,
        description_hi TEXT,
        syllabus_json TEXT
    )
    ''')
    
    conn.commit()
    seed_data(cursor, conn)
    conn.close()

def seed_data(cursor, conn):
    # Check if data exists
    cursor.execute("SELECT count(*) FROM igot_courses")
    if cursor.fetchone()[0] > 0:
        return

    courses = [
        {
            "id": "c1",
            "title": "Foundation: Statistical Survey Design",
            "title_hi": "नींव: सांख्यिकीय सर्वेक्षण डिजाइन",
            "level": "Beginner",
            "sequence_order": 1,
            "competency_tag": "Fundamentals",
            "duration": 4.5,
            "provider": "NSSTA",
            "description": "Introduction to basic concepts of sampling and survey design.",
            "description_hi": "नमूनाकरण और सर्वेक्षण डिजाइन की बुनियादी अवधारणाओं का परिचय।",
            "syllabus_json": json.dumps(["Module 1: Intro to Sampling", "Module 2: Random vs Non-random", "Module 3: Ethics in Data Collection"])
        },
        {
            "id": "c2",
            "title": "Intermediate Mastery: National Accounts",
            "title_hi": "मध्यवर्ती महारत: राष्ट्रीय खाते",
            "level": "Intermediate",
            "sequence_order": 2,
            "competency_tag": "Application",
            "duration": 6.0,
            "provider": "NSSTA",
            "description": "Understanding GDP, GVA, and macroeconomic indicators.",
            "description_hi": "सकल घरेलू उत्पाद, सकल मूल्य वर्धित और व्यापक आर्थिक संकेतकों को समझना।",
            "syllabus_json": json.dumps(["Module 1: Concept of GDP", "Module 2: Estimation Methods", "Module 3: Real vs Nominal GDP"])
        },
        {
            "id": "c3",
            "title": "Advanced Specialization: Price Indices",
            "title_hi": "उन्नत विशेषज्ञता: मूल्य सूचकांक",
            "level": "Advanced",
            "sequence_order": 3,
            "competency_tag": "Advanced Analysis",
            "duration": 8.0,
            "provider": "NSSTA",
            "description": "Deep dive into CPI, WPI, and inflation modeling.",
            "description_hi": "सीपीआई, डब्ल्यूपीआई और मुद्रास्फीति मॉडलिंग में गहराई से गोता लगाना।",
            "syllabus_json": json.dumps(["Module 1: Index Number Theory", "Module 2: Laspeyres vs Paasche", "Module 3: CPI compilation"])
        }
    ]

    for c in courses:
        cursor.execute('''
        INSERT INTO igot_courses (id, title, title_hi, level, sequence_order, competency_tag, duration, provider, description, description_hi, syllabus_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (c['id'], c['title'], c['title_hi'], c['level'], c['sequence_order'], c['competency_tag'], c['duration'], c['provider'], c['description'], c['description_hi'], c['syllabus_json']))

    conn.commit()

if __name__ == "__main__":
    init_db()
