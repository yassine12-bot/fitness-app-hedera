const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connexion à la base de données
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🌱 Seed des challenges...\n');

// ====================================================
// DÉFINITION DES 15 CHALLENGES (5 niveaux × 3 types)
// ====================================================

const challenges = [
  // ====================================================
  // 🌱 NIVEAU 1 - DÉBUTANT
  // ====================================================
  {
    title: "Premier Pas",
    description: "Marcher 1000 pas aujourd'hui",
    type: "daily_steps",
    level: 1,
    target: 1000,
    duration: null,
    reward: 5
  },
  {
    title: "Début d'Aventure",
    description: "Marcher 3000 pas en 3 jours",
    type: "duration_steps",
    level: 1,
    target: 3000,
    duration: 3,
    reward: 10
  },
  {
    title: "Partage Ton Début",
    description: "Poster 2 posts cette semaine",
    type: "social",
    level: 1,
    target: 2,
    duration: 7,
    reward: 8
  },

  // ====================================================
  // 🔵 NIVEAU 2 - INTERMÉDIAIRE
  // ====================================================
  {
    title: "Randonneur",
    description: "Marcher 5000 pas aujourd'hui",
    type: "daily_steps",
    level: 2,
    target: 5000,
    duration: null,
    reward: 15
  },
  {
    title: "Marathonien Débutant",
    description: "Marcher 15000 pas en 5 jours",
    type: "duration_steps",
    level: 2,
    target: 15000,
    duration: 5,
    reward: 30
  },
  {
    title: "Ambassadeur",
    description: "Poster 3 posts cette semaine",
    type: "social",
    level: 2,
    target: 3,
    duration: 7,
    reward: 20
  },

  // ====================================================
  // 🟡 NIVEAU 3 - AVANCÉ
  // ====================================================
  {
    title: "Marcheur Sérieux",
    description: "Marcher 10000 pas aujourd'hui",
    type: "daily_steps",
    level: 3,
    target: 10000,
    duration: null,
    reward: 30
  },
  {
    title: "Endurance Pro",
    description: "Marcher 50000 pas en 7 jours",
    type: "duration_steps",
    level: 3,
    target: 50000,
    duration: 7,
    reward: 60
  },
  {
    title: "Influenceur Fitness",
    description: "Poster 5 posts cette semaine",
    type: "social",
    level: 3,
    target: 5,
    duration: 7,
    reward: 35
  },

  // ====================================================
  // 🔴 NIVEAU 4 - EXPERT
  // ====================================================
  {
    title: "Champion du Jour",
    description: "Marcher 15000 pas aujourd'hui",
    type: "daily_steps",
    level: 4,
    target: 15000,
    duration: null,
    reward: 50
  },
  {
    title: "Ultra-Marathonien",
    description: "Marcher 100000 pas en 10 jours",
    type: "duration_steps",
    level: 4,
    target: 100000,
    duration: 10,
    reward: 100
  },
  {
    title: "Leader Communautaire",
    description: "Poster 7 posts cette semaine",
    type: "social",
    level: 4,
    target: 7,
    duration: 7,
    reward: 50
  },

  // ====================================================
  // 👑 NIVEAU 5 - MAÎTRE
  // ====================================================
  {
    title: "Maître du Mouvement",
    description: "Marcher 20000 pas aujourd'hui",
    type: "daily_steps",
    level: 5,
    target: 20000,
    duration: null,
    reward: 80
  },
  {
    title: "Légende Vivante",
    description: "Marcher 200000 pas en 14 jours",
    type: "duration_steps",
    level: 5,
    target: 200000,
    duration: 14,
    reward: 200
  },
  {
    title: "Icône du Fitness",
    description: "Poster 10 posts cette semaine",
    type: "social",
    level: 5,
    target: 10,
    duration: 7,
    reward: 80
  }
];

// ====================================================
// INSERTION DANS LA BASE DE DONNÉES
// ====================================================

db.serialize(() => {
  // Préparer la requête d'insertion
  const stmt = db.prepare(`
    INSERT INTO challenges (title, description, type, level, target, duration, reward)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Insérer chaque challenge
  challenges.forEach((challenge, index) => {
    stmt.run(
      challenge.title,
      challenge.description,
      challenge.type,
      challenge.level,
      challenge.target,
      challenge.duration,
      challenge.reward,
      (err) => {
        if (err) {
          console.error(`❌ Erreur insertion challenge ${index + 1}:`, err.message);
        } else {
          const emoji = ['🌱', '🔵', '🟡', '🔴', '👑'][challenge.level - 1];
          console.log(`${emoji} [Niveau ${challenge.level}] ${challenge.title} → ${challenge.reward} FIT`);
        }
      }
    );
  });

  stmt.finalize();

  // Afficher le résumé
  db.get("SELECT COUNT(*) as count FROM challenges", (err, row) => {
    if (err) {
      console.error('❌ Erreur:', err.message);
    } else {
      console.log('\n✅ Seed terminé !');
      console.log(`📊 Total: ${row.count} challenges créés`);
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
    }
    
    db.close();
  });
});