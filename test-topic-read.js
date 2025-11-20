require('dotenv').config();
const {
  Client,
  TopicMessageQuery,
  PrivateKey
} = require("@hashgraph/sdk");

async function testTopicRead() {
  console.log('🧪 Test de lecture du Topic Hedera\n');

  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_PRIVATE_KEY;
  const topicId = process.env.ACTIVITY_TOPIC_ID;

  console.log('📋 Configuration:');
  console.log(`   Account ID: ${operatorId || '❌ MANQUANT'}`);
  console.log(`   Private Key: ${operatorKey ? '✅ Présent' : '❌ MANQUANT'}`);
  console.log(`   Topic ID: ${topicId || '❌ MANQUANT'}\n`);

  if (!operatorId || !operatorKey || !topicId) {
    console.log('❌ Variables manquantes dans .env\n');
    console.log('Ajoute dans .env:');
    console.log('ACTIVITY_TOPIC_ID=0.0.7249704');
    console.log('HEDERA_ACCOUNT_ID=0.0.xxx');
    console.log('HEDERA_PRIVATE_KEY=302...\n');
    process.exit(1);
  }

  try {
    const client = Client.forTestnet();
    client.setOperator(operatorId, PrivateKey.fromStringECDSA(operatorKey));

    console.log('✅ Client Hedera créé');
    console.log('🔍 Lecture du Topic (15 secondes)...\n');

    let messageCount = 0;

    const subscription = new TopicMessageQuery()
      .setTopicId(topicId)
      .setLimit(50)
      .subscribe(
        client,
        (error) => {
          console.error('❌ Erreur subscription:', error);
        },
        (message) => {
          messageCount++;
          try {
            const content = Buffer.from(message.contents).toString();
            const data = JSON.parse(content);
            console.log(`📝 Message #${message.sequenceNumber}:`);
            console.log(`   Timestamp: ${data.timestamp}`);
            console.log(`   User: ${data.userId}`);
            console.log(`   Action: ${data.action}\n`);
          } catch (error) {
            console.log(`📝 Message #${message.sequenceNumber}: (erreur parsing)\n`);
          }
        }
      );

    // Attendre 15 secondes
    await new Promise(resolve => setTimeout(resolve, 15000));

    subscription.unsubscribe();
    client.close();

    console.log(`\n✅ Test terminé`);
    console.log(`📊 Total messages reçus: ${messageCount}\n`);

    if (messageCount === 0) {
      console.log('⚠️  Aucun message reçu. Causes possibles:');
      console.log('   1. Topic ID incorrect dans .env');
      console.log('   2. Aucun message dans le Topic');
      console.log('   3. Messages trop anciens (>30 jours)');
      console.log('   4. Problème de connexion Hedera\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testTopicRead();