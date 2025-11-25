// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FitnessContract - FIXED VERSION
 * @notice Adds level system and challenge type filtering
 */

interface IHRC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FitnessContract {
    address public owner;
    address public fitTokenAddress;
    IHRC20 public fitToken;
    
    // User data
    mapping(address => uint256) public totalSteps;
    mapping(address => uint256) public userLevel; // NEW: Track user level
    
    // Challenge data
    uint256 public challengeCount;
    mapping(uint256 => uint256) public challengeTarget;
    mapping(uint256 => uint256) public challengeReward;
    mapping(uint256 => uint256) public challengeLevel;
    mapping(uint256 => uint256) public challengeType; // NEW: 1=daily, 2=duration, 3=social
    mapping(uint256 => bool) public challengeActive;
    
    // User progress
    mapping(address => mapping(uint256 => uint256)) public userChallengeProgress;
    mapping(address => mapping(uint256 => bool)) public challengeCompleted;
    
    // Events
    event WorkoutLogged(address indexed user, uint256 steps, uint256 timestamp);
    event ChallengeCompleted(address indexed user, uint256 indexed challengeId, uint256 reward, uint256 timestamp);
    event ChallengeAdded(uint256 indexed challengeId, uint256 target, uint256 reward, uint256 level, uint256 challengeType);
    event RewardDistributed(address indexed user, uint256 amount, string reason);
    event LevelUp(address indexed user, uint256 newLevel); // NEW
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(address _fitTokenAddress) {
        owner = msg.sender;
        fitTokenAddress = _fitTokenAddress;
        fitToken = IHRC20(_fitTokenAddress);
    }
    
    /**
     * Update user steps - FIXED to filter by level and type
     */
    function updateSteps(address user, uint256 steps) external {
        require(steps > 0, "Steps must be positive");
        
        totalSteps[user] += steps;
        emit WorkoutLogged(user, steps, block.timestamp);
        
        _checkAndCompleteChallenges(user, steps);
    }
    
    /**
     * FIXED: Only check challenges at user's level and only step-based challenges
     */
    function _checkAndCompleteChallenges(address user, uint256 newSteps) internal {
        uint256 currentLevel = userLevel[user];
        if (currentLevel == 0) currentLevel = 1; // Start at level 1
        
        for (uint256 i = 1; i <= challengeCount; i++) {
            // Skip if not at user's current level
            if (challengeLevel[i] != currentLevel) {
                continue;
            }
            
            // Skip if not active or already completed
            if (!challengeActive[i] || challengeCompleted[user][i]) {
                continue;
            }
            
            // ONLY add steps to step-based challenges (1=daily, 2=duration)
            // Social challenges (3) are NOT updated here
            if (challengeType[i] == 1 || challengeType[i] == 2) {
                userChallengeProgress[user][i] += newSteps;
                
                if (userChallengeProgress[user][i] >= challengeTarget[i]) {
                    _completeChallenge(user, i);
                }
            }
        }
    }
    
    /**
     * Complete a challenge and check for level up
     */
    function _completeChallenge(address user, uint256 challengeId) internal {
        challengeCompleted[user][challengeId] = true;
        
        uint256 reward = challengeReward[challengeId];
        
        if (fitToken.balanceOf(address(this)) >= reward) {
            fitToken.transfer(user, reward);
            emit RewardDistributed(user, reward, "Challenge completed");
        }
        
        emit ChallengeCompleted(user, challengeId, reward, block.timestamp);
        
        // Check if all challenges at this level are complete
        uint256 level = challengeLevel[challengeId];
        if (_isLevelComplete(user, level)) {
            userLevel[user] = level + 1;
            emit LevelUp(user, level + 1);
        }
    }
    
    /**
     * Check if all challenges at a level are complete
     */
    function _isLevelComplete(address user, uint256 level) internal view returns (bool) {
        for (uint256 i = 1; i <= challengeCount; i++) {
            if (challengeLevel[i] == level) {
                if (!challengeCompleted[user][i]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * NEW: Manually complete social challenge
     */
    function completeSocialChallenge(address user, uint256 challengeId) external onlyOwner {
        require(challengeType[challengeId] == 3, "Not a social challenge");
        require(challengeLevel[challengeId] == userLevel[user] || (userLevel[user] == 0 && challengeLevel[challengeId] == 1), "Challenge not at user level");
        require(!challengeCompleted[user][challengeId], "Already completed");
        
        userChallengeProgress[user][challengeId] = challengeTarget[challengeId];
        _completeChallenge(user, challengeId);
    }
    
    /**
     * Add challenge - NEW: includes challengeType
     */
    function addChallenge(
        uint256 target,
        uint256 reward,
        uint256 level,
        uint256 cType // 1=daily, 2=duration, 3=social
    ) external onlyOwner {
        require(cType >= 1 && cType <= 3, "Invalid challenge type");
        
        challengeCount++;
        challengeTarget[challengeCount] = target;
        challengeReward[challengeCount] = reward;
        challengeLevel[challengeCount] = level;
        challengeType[challengeCount] = cType;
        challengeActive[challengeCount] = true;
        
        emit ChallengeAdded(challengeCount, target, reward, level, cType);
    }
    
    function deactivateChallenge(uint256 challengeId) external onlyOwner {
        require(challengeId > 0 && challengeId <= challengeCount, "Invalid ID");
        challengeActive[challengeId] = false;
    }
    
    function distributeReward(address user, uint256 amount) external onlyOwner {
        require(fitToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        fitToken.transfer(user, amount);
        emit RewardDistributed(user, amount, "Manual distribution");
    }
    
    function withdrawTokens(uint256 amount) external onlyOwner {
        fitToken.transfer(owner, amount);
    }
    
    // View functions
    function getTotalSteps(address user) external view returns (uint256) {
        return totalSteps[user];
    }
    
    function getUserLevel(address user) external view returns (uint256) {
        uint256 level = userLevel[user];
        return level == 0 ? 1 : level;
    }
    
    function getChallenge(uint256 challengeId) external view returns (
        uint256 target,
        uint256 reward,
        uint256 level,
        bool active
    ) {
        require(challengeId > 0 && challengeId <= challengeCount, "Invalid ID");
        return (
            challengeTarget[challengeId],
            challengeReward[challengeId],
            challengeLevel[challengeId],
            challengeActive[challengeId]
        );
    }
    
    function getChallengeProgress(address user, uint256 challengeId) external view returns (uint256) {
        return userChallengeProgress[user][challengeId];
    }
    
    function isChallengeCompleted(address user, uint256 challengeId) external view returns (bool) {
        return challengeCompleted[user][challengeId];
    }
    
    function getContractBalance() external view returns (uint256) {
        return fitToken.balanceOf(address(this));
    }
}
