// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FitnessContract
 * @notice Manages fitness tracking, challenges, and automatic rewards
 * @dev Tracks user steps, validates challenges, distributes FIT token rewards
 */

interface IHRC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FitnessContract {
    // ====================================================
    // STATE VARIABLES
    // ====================================================
    
    address public owner;
    address public fitTokenAddress;
    IHRC20 public fitToken;
    
    // User step tracking
    mapping(address => uint256) public totalSteps;
    
    // Challenge structure
    struct Challenge {
        uint256 id;
        string title;
        string challengeType; // "daily_steps", "duration_steps", "social"
        uint256 target;
        uint256 reward;
        uint256 level;
        bool isActive;
    }
    
    // Challenges storage
    mapping(uint256 => Challenge) public challenges;
    uint256 public challengeCount;
    
    // User challenge progress
    mapping(address => mapping(uint256 => uint256)) public userChallengeProgress;
    mapping(address => mapping(uint256 => bool)) public challengeCompleted;
    
    // ====================================================
    // EVENTS
    // ====================================================
    
    event WorkoutLogged(
        address indexed user,
        uint256 steps,
        uint256 timestamp
    );
    
    event ChallengeCompleted(
        address indexed user,
        uint256 indexed challengeId,
        uint256 reward,
        uint256 timestamp
    );
    
    event ChallengeAdded(
        uint256 indexed challengeId,
        string title,
        uint256 target,
        uint256 reward
    );
    
    event RewardDistributed(
        address indexed user,
        uint256 amount,
        string reason
    );
    
    // ====================================================
    // MODIFIERS
    // ====================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    // ====================================================
    // CONSTRUCTOR
    // ====================================================
    
    constructor(address _fitTokenAddress) {
        owner = msg.sender;
        fitTokenAddress = _fitTokenAddress;
        fitToken = IHRC20(_fitTokenAddress);
    }
    
    // ====================================================
    // CORE FUNCTIONS
    // ====================================================
    
    /**
     * @notice Update user steps and check challenge progress
     * @param user User address
     * @param steps Number of steps to add
     */
    function updateSteps(address user, uint256 steps) external {
        require(steps > 0, "Steps must be positive");
        
        // Update total steps
        totalSteps[user] += steps;
        
        // Emit workout event
        emit WorkoutLogged(user, steps, block.timestamp);
        
        // Check all active challenges for this user
        _checkAndCompleteChallenges(user, steps);
    }
    
    /**
     * @notice Internal function to check and complete challenges
     * @param user User address
     * @param newSteps Steps just added
     */
    function _checkAndCompleteChallenges(address user, uint256 newSteps) internal {
        for (uint256 i = 1; i <= challengeCount; i++) {
            Challenge memory challenge = challenges[i];
            
            // Skip if challenge not active or already completed
            if (!challenge.isActive || challengeCompleted[user][i]) {
                continue;
            }
            
            // Only check step-based challenges
            if (
                keccak256(bytes(challenge.challengeType)) == keccak256(bytes("daily_steps")) ||
                keccak256(bytes(challenge.challengeType)) == keccak256(bytes("duration_steps"))
            ) {
                // Update progress
                userChallengeProgress[user][i] += newSteps;
                
                // Check if challenge completed
                if (userChallengeProgress[user][i] >= challenge.target) {
                    _completeChallenge(user, i);
                }
            }
        }
    }
    
    /**
     * @notice Complete a challenge and distribute reward
     * @param user User address
     * @param challengeId Challenge ID
     */
    function _completeChallenge(address user, uint256 challengeId) internal {
        Challenge memory challenge = challenges[challengeId];
        
        // Mark as completed
        challengeCompleted[user][challengeId] = true;
        
        // Transfer reward (if contract has balance)
        if (fitToken.balanceOf(address(this)) >= challenge.reward) {
            fitToken.transfer(user, challenge.reward);
            emit RewardDistributed(user, challenge.reward, "Challenge completed");
        }
        
        // Emit challenge completed event
        emit ChallengeCompleted(
            user,
            challengeId,
            challenge.reward,
            block.timestamp
        );
    }
    
    // ====================================================
    // ADMIN FUNCTIONS
    // ====================================================
    
    /**
     * @notice Add a new challenge
     * @param title Challenge title
     * @param challengeType Type of challenge
     * @param target Target value (steps)
     * @param reward Reward in FIT tokens
     * @param level Challenge level
     */
    function addChallenge(
        string memory title,
        string memory challengeType,
        uint256 target,
        uint256 reward,
        uint256 level
    ) external onlyOwner {
        challengeCount++;
        
        challenges[challengeCount] = Challenge({
            id: challengeCount,
            title: title,
            challengeType: challengeType,
            target: target,
            reward: reward,
            level: level,
            isActive: true
        });
        
        emit ChallengeAdded(challengeCount, title, target, reward);
    }
    
    /**
     * @notice Deactivate a challenge
     * @param challengeId Challenge ID to deactivate
     */
    function deactivateChallenge(uint256 challengeId) external onlyOwner {
        require(challengeId > 0 && challengeId <= challengeCount, "Invalid challenge ID");
        challenges[challengeId].isActive = false;
    }
    
    /**
     * @notice Manually distribute reward (for social challenges, etc.)
     * @param user User address
     * @param amount Reward amount
     */
    function distributeReward(address user, uint256 amount) external onlyOwner {
        require(fitToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");
        fitToken.transfer(user, amount);
        emit RewardDistributed(user, amount, "Manual distribution");
    }
    
    /**
     * @notice Withdraw FIT tokens from contract (emergency)
     * @param amount Amount to withdraw
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        fitToken.transfer(owner, amount);
    }
    
    // ====================================================
    // VIEW FUNCTIONS
    // ====================================================
    
    /**
     * @notice Get user total steps
     * @param user User address
     * @return Total steps
     */
    function getTotalSteps(address user) external view returns (uint256) {
        return totalSteps[user];
    }
    
    /**
     * @notice Get challenge details
     * @param challengeId Challenge ID
     * @return Challenge struct
     */
    function getChallenge(uint256 challengeId) external view returns (Challenge memory) {
        require(challengeId > 0 && challengeId <= challengeCount, "Invalid challenge ID");
        return challenges[challengeId];
    }
    
    /**
     * @notice Get user progress on a challenge
     * @param user User address
     * @param challengeId Challenge ID
     * @return Current progress
     */
    function getChallengeProgress(address user, uint256 challengeId) external view returns (uint256) {
        return userChallengeProgress[user][challengeId];
    }
    
    /**
     * @notice Check if user completed a challenge
     * @param user User address
     * @param challengeId Challenge ID
     * @return True if completed
     */
    function isChallengeCompleted(address user, uint256 challengeId) external view returns (bool) {
        return challengeCompleted[user][challengeId];
    }
    
    /**
     * @notice Get contract FIT token balance
     * @return Token balance
     */
    function getContractBalance() external view returns (uint256) {
        return fitToken.balanceOf(address(this));
    }
}