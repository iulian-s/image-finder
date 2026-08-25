import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('memes.db');

export function initDatabase() {
    // Ensure memes table exists with a UNIQUE constraint on uri
    db.execSync(`
    CREATE TABLE IF NOT EXISTS memes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uri TEXT UNIQUE,
      extracted_text TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_memes_text ON memes(extracted_text);
  `);

    // Purge any lingering duplicate rows in existing tables
    db.execSync(`
        DELETE FROM memes
        WHERE id NOT IN (
            SELECT MIN(id) FROM memes GROUP BY uri
        );
    `);
}

export function isMemeIndexed(uri: string): boolean {
    const row = db.getFirstSync<{ id: number }>(
        'SELECT id FROM memes WHERE uri = ? LIMIT 1;',
        [uri]
    );
    return !!row;
}

export function saveMeme(uri: string, text: string) {
    // Replace if exists, insert if new
    const statement = db.prepareSync(`
        INSERT INTO memes (uri, extracted_text)
        VALUES ($uri, $text)
            ON CONFLICT(uri) DO UPDATE SET extracted_text = $text;
    `);
    statement.executeSync({
        $uri: uri,
        $text: text.toLowerCase()
    });
}

export function searchMemes(query: string): { uri: string; extracted_text: string }[] {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return getAllMemes();

    // Split multi-word queries (e.g. "dropped queen") so every word must match somewhere in the text
    const words = cleanQuery.split(/\s+/).filter(Boolean);
    const whereClauses = words.map(() => `extracted_text LIKE ?`).join(' AND ');
    const params = words.map(w => `%${w}%`);

    try {
        return db.getAllSync<{ uri: string; extracted_text: string }>(
            `SELECT uri, extracted_text FROM memes WHERE ${whereClauses} ORDER BY id DESC LIMIT 50;`,
            params
        );
    } catch (error) {
        console.warn('Search query error:', error);
        return [];
    }
}

export function getAllMemes(): { uri: string; extracted_text: string }[] {
    return db.getAllSync<{ uri: string; extracted_text: string }>(
        `SELECT uri, extracted_text FROM memes ORDER BY rowid DESC;`
    );
}

export function getInitialMemes(limit: number = 30): { uri: string; extracted_text: string }[] {
    return db.getAllSync<{ uri: string; extracted_text: string }>(
        `SELECT uri, extracted_text FROM memes ORDER BY id DESC LIMIT ?;`,
        [limit]
    );
}
