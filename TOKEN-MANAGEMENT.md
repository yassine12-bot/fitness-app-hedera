# 💰 Token Management Scripts

## Overview
Two scripts for managing FIT tokens in your Hedera fitness app.

---

## 1️⃣ Mint FIT to Users (`mint-fit-to-users.js`)

### Purpose:
Give FIT tokens to **user wallets** so they can purchase products in the marketplace.

### When to Use:
- 🧪 **Testing** - Give test users tokens to buy products
- 🏃 **Rewards** - Give users tokens for completing workouts (alternative to contract rewards)
- 💸 **Airdrops** - Distribute tokens to all users

### How It Works:
```
Treasury Wallet → Transfer FIT → User Wallets
```

### Run It:
```powershell
node mint-fit-to-users.js
```

### Example Output:
```
💰 Minting FIT Tokens to Users...

Found 3 users with wallets:

How many FIT tokens to give each user? (default: 100): 50

🪙 Minting 50 FIT to each user...

  → Test User (test@example.com)
     Current balance: 100 FIT
     Hedera Account: 0.0.7307810
     ✅ Sent 50 FIT
     New balance: 150 FIT
     TX: 0.0.5459279@1763934690.539107119

✅ Done minting FIT tokens!
```

---

## 2️⃣ Fund FitnessContract (`fund-fitness-contract.js`)

### Purpose:
Give FIT tokens to the **FitnessContract** so it can pay rewards to users who complete challenges.

### When to Use:
- 🏆 **Challenge Rewards** - Contract needs tokens to pay users who complete challenges
- 🔋 **Refill** - When contract runs out of tokens
- 🚀 **Initial Setup** - Fund contract before launching challenges

### How It Works:
```
Treasury Wallet → Transfer FIT → FitnessContract → Pays Users for Challenges
```

### Run It:
```powershell
node fund-fitness-contract.js
```

### Example Output:
```
💰 Funding FitnessContract with FIT Tokens...

How many FIT tokens to send to FitnessContract? (default: 1000): 500

🪙 Sending 500 FIT to FitnessContract...

   From: 0.0.5459279 (Treasury)
   To: 0.0.7303410 (FitnessContract)

✅ Successfully funded FitnessContract!
   Amount: 500 FIT
   Status: SUCCESS
   TX: 0.0.5459279@1763934690.539107119
   Explorer: https://hashscan.io/testnet/transaction/...

ℹ️  The FitnessContract can now pay rewards to users who complete challenges!
```

---

## 🔄 Key Difference

| Aspect | Mint to Users | Fund Contract |
|--------|--------------|---------------|
| **Recipient** | User wallets | FitnessContract |
| **Purpose** | Users buy products | Contract pays challenge rewards |
| **Flow** | Treasury → Users | Treasury → Contract → Users (later) |
| **When** | Before purchases | Before launching challenges |
| **Example** | Give 100 FIT to test users | Give 1000 FIT to contract for rewards |

---

## 💡 Typical Workflow

1. **Initial Setup:**
   ```powershell
   # Fund contract for challenge rewards
   node fund-fitness-contract.js
   # Enter: 1000
   ```

2. **Give Users Tokens:**
   ```powershell
   # Give users tokens to buy products
   node mint-fit-to-users.js
   # Enter: 100
   ```

3. **Users Can Now:**
   - ✅ Buy products in marketplace (using their 100 FIT)
   - ✅ Complete challenges and get rewards (from contract's 1000 FIT)

---

## 🎯 Quick Reference

**Want users to buy products?**
→ Run `mint-fit-to-users.js`

**Want contract to pay challenge rewards?**
→ Run `fund-fitness-contract.js`

**Both?**
→ Run both scripts! 🚀
