const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data.db');

console.log('🔄 INSTALLATION COMPLÈTE DES CHALLENGES DANS data.db\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur connexion:', err.message);
    process.exit(1);
  }
  console.log('✅ Connecté à data.db\n');
});

db.serialize(() => {
  
  // ====================================================
  // ÉTAPE 1 : SUPPRIMER LES ANCIENNES TABLES
  // ====================================================
  
  console.log('📋 ÉTAPE 1 : Nettoyage des anciennes tables...\n');
  
  db.run('DROP TABLE IF EXISTS challenge_progress', (err) => {
    if (!err) console.log('🗑️  challenge_progress supprimée');
  });
  
  db.run('DROP TABLE IF EXISTS challenges', (err) => {
    if (!err) console.log('🗑️  challenges supprimée');
  });
  
  db.run('DROP TABLE IF EXISTS challenge_completions', (err) => {
    if (!err) console.log('🗑️  challenge_completions supprimée');
  });
  
  // user_challenge_levels déjà créée, on la garde
  
  console.log('');
  
  // ====================================================
  // ÉTAPE 2 : CRÉER LES NOUVELLES TABLES
  // ====================================================
  
  console.log('📋 ÉTAPE 2 : Création des nouvelles tables...\n');
  
  db.run(`
    CREATE TABLE challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      level INTEGER NOT NULL,
      target INTEGER NOT NULL,
      duration INTEGER,
      reward INTEGER NOT NULL,
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Erreur challenges:', err.message);
    else console.log('✅ Table challenges créée');
  });
  
  db.run(`
    CREATE TABLE challenge_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      challengeId INTEGER NOT NULL,
      progress INTEGER DEFAULT 0,
      startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
      isCompleted INTEGER DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (challengeId) REFERENCES challenges(id) ON DELETE CASCADE,
      UNIQUE(userId, challengeId)
    )
  `, (err) => {
    if (err) console.error('❌ Erreur challenge_progress:', err.message);
    else console.log('✅ Table challenge_progress créée');
  });
  
  db.run(`
    CREATE TABLE challenge_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      challengeId INTEGER NOT NULL,
      challengeTitle TEXT NOT NULL,
      challengeLevel INTEGER NOT NULL,
      reward INTEGER NOT NULL,
      completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      hederaTxId TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Erreur challenge_completions:', err.message);
    else console.log('✅ Table challenge_completions créée');
  });
  
  // Créer les indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_challenges_level ON challenges(level)');
  db.run('CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON challenge_progress(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_challenge_completions_user ON challenge_completions(userId)', (err) => {
    if (!err) {
      console.log('✅ Indexes créés\n');
      
      // ====================================================
      // ÉTAPE 3 : INSÉRER LES 15 CHALLENGES
      // ====================================================
      
      console.log('📋 ÉTAPE 3 : Insertion des 15 challenges...\n');
      
      const challenges = [
        // NIVEAU 1 - DÉBUTANT
        { title: "Premier Pas", description: "Marcher 1000 pas aujourd'hui", type: "daily_steps", level: 1, target: 1000, duration: null, reward: 5 },
        { title: "Début d'Aventure", description: "Marcher 3000 pas en 3 jours", type: "duration_steps", level: 1, target: 3000, duration: 3, reward: 10 },
        { title: "Partage Ton Début", description: "Poster 2 posts cette semaine", type: "social", level: 1, target: 2, duration: 7, reward: 8 },
        
        // NIVEAU 2 - INTERMÉDIAIRE
        { title: "Randonneur", description: "Marcher 5000 pas aujourd'hui", type: "daily_steps", level: 2, target: 5000, duration: null, reward: 15 },
        { title: "Marathonien Débutant", description: "Marcher 15000 pas en 5 jours", type: "duration_steps", level: 2, target: 15000, duration: 5, reward: 30 },
        { title: "Ambassadeur", description: "Poster 3 posts cette semaine", type: "social", level: 2, target: 3, duration: 7, reward: 20 },
        
        // NIVEAU 3 - AVANCÉ
        { title: "Marcheur Sérieux", description: "Marcher 10000 pas aujourd'hui", type: "daily_steps", level: 3, target: 10000, duration: null, reward: 30 },
        { title: "Endurance Pro", description: "Marcher 50000 pas en 7 jours", type: "duration_steps", level: 3, target: 50000, duration: 7, reward: 60 },
        { title: "Influenceur Fitness", description: "Poster 5 posts cette semaine", type: "social", level: 3, target: 5, duration: 7, reward: 35 },
        
        // NIVEAU 4 - EXPERT
        { title: "Champion du Jour", description: "Marcher 15000 pas aujourd'hui", type: "daily_steps", level: 4, target: 15000, duration: null, reward: 50 },
        { title: "Ultra-Marathonien", description: "Marcher 100000 pas en 10 jours", type: "duration_steps", level: 4, target: 100000, duration: 10, reward: 100 },
        { title: "Leader Communautaire", description: "Poster 7 posts cette semaine", type: "social", level: 4, target: 7, duration: 7, reward: 50 },
        
        // NIVEAU 5 - MAÎTRE
        { title: "Maître du Mouvement", description: "Marcher 20000 pas aujourd'hui", type: "daily_steps", level: 5, target: 20000, duration: null, reward: 80 },
        { title: "Légende Vivante", description: "Marcher 200000 pas en 14 jours", type: "duration_steps", level: 5, target: 200000, duration: 14, reward: 200 },
        { title: "Icône du Fitness", description: "Poster 10 posts cette semaine", type: "social", level: 5, target: 10, duration: 7, reward: 80 }
      ];
      
      const stmt = db.prepare(`
        INSERT INTO challenges (title, description, type, level, target, duration, reward)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      let inserted = 0;
      
      challenges.forEach((challenge) => {
        stmt.run(
          challenge.title,
          challenge.description,
          challenge.type,
          challenge.level,
          challenge.target,
          challenge.duration,
          challenge.reward,
          (err) => {
            inserted++;
            
            if (err) {
              console.error(`❌ ${challenge.title}:`, err.message);
            } else {
              const emoji = ['🌱', '🔵', '🟡', '🔴', '👑'][challenge.level - 1];
              console.log(`${emoji} [Niveau ${challenge.level}] ${challenge.title} → ${challenge.reward} FIT`);
            }
            
            if (inserted === challenges.length) {
              stmt.finalize();
              
              db.get("SELECT COUNT(*) as count FROM challenges", (err, row) => {
                console.log('\n✅ Installation terminée !');
                console.log(`📊 Total: ${row.count} challenges dans data.db`);
                console.log('\n📋 Répartition:');
                console.log('   🌱 Niveau 1 (Débutant): 3 challenges');
                console.log('   🔵 Niveau 2 (Intermédiaire): 3 challenges');
                console.log('   🟡 Niveau 3 (Avancé): 3 challenges');
                console.log('   🔴 Niveau 4 (Expert): 3 challenges');
                console.log('   👑 Niveau 5 (Maître): 3 challenges');
                console.log('\n🎯 Types:');
                console.log('   📅 Quotidiens (daily_steps): 5 challenges');
                console.log('   ⏱️  Durée (duration_steps): 5 challenges');
                console.log('   👥 Sociaux (social): 5 challenges');
                console.log('\n👉 Redémarrez le serveur : npm start');
                console.log('👉 Supprimez database.sqlite si vous voulez : Remove-Item database.sqlite');
                
                db.close();
              });
            }
          }
        );
      });
    }
  });
});