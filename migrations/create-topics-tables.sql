-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  creatorId INTEGER NOT NULL,
  isPrivate INTEGER DEFAULT 0,
  memberCount INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creatorId) REFERENCES users(id)
);

-- Topic members
CREATE TABLE IF NOT EXISTS topic_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topicId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  role TEXT DEFAULT 'member',
  joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topicId) REFERENCES topics(id),
  FOREIGN KEY (userId) REFERENCES users(id),
  UNIQUE(topicId, userId)
);

-- Topic messages
CREATE TABLE IF NOT EXISTS topic_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topicId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  message TEXT NOT NULL,
  messageType TEXT DEFAULT 'text',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topicId) REFERENCES topics(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Topic events
CREATE TABLE IF NOT EXISTS topic_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topicId INTEGER NOT NULL,
  creatorId INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  eventDate DATETIME NOT NULL,
  location TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topicId) REFERENCES topics(id),
  FOREIGN KEY (creatorId) REFERENCES users(id)
);

-- Event participants
CREATE TABLE IF NOT EXISTS event_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  status TEXT DEFAULT 'going',
  joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (eventId) REFERENCES topic_events(id),
  FOREIGN KEY (userId) REFERENCES users(id),
  UNIQUE(eventId, userId)
);
