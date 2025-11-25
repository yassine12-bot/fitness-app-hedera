// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MarketplaceContract (UPDATED VERSION)
 * @notice NFT marketplace for purchasing products with FIT tokens
 * @dev Handles product definition, purchases, NFT minting, and QR verification
 * 
 * NEW FEATURES:
 * - updatePrice() - Change product prices without redeploying
 * - getNFTCount() - Get total NFT count for ID extraction
 * - PriceUpdated event for tracking price changes
 */

interface IHRC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MarketplaceContract {
    // ====================================================
    // STATE VARIABLES
    // ====================================================
    
    address public owner;
    address public treasury; // Where FIT tokens go
    address public fitTokenAddress;
    IHRC20 public fitToken;
    
    // Product structure
    struct Product {
        uint256 id;
        string name;
        string description;
        string category;
        uint256 priceTokens;
        uint256 stock;
        string imageUrl;
        bool isActive;
    }
    
    // NFT structure (purchase receipt)
    struct NFT {
        uint256 id;
        uint256 productId;
        address owner;
        uint256 purchaseDate;
        bool isUsed;
        uint256 usedDate;
        string metadata; // JSON metadata
    }
    
    // Storage
    mapping(uint256 => Product) public products;
    uint256 public productCount;
    
    mapping(uint256 => NFT) public nfts;
    uint256 public nftCount;
    
    mapping(address => uint256[]) public userNFTs;
    
    // ====================================================
    // EVENTS
    // ====================================================
    
    event ProductAdded(
        uint256 indexed productId,
        string name,
        uint256 price
    );
    
    event NFTPurchased(
        address indexed buyer,
        uint256 indexed nftId,
        uint256 indexed productId,
        uint256 price,
        uint256 timestamp
    );
    
    event NFTUsed(
        uint256 indexed nftId,
        uint256 timestamp
    );
    
    event StockUpdated(
        uint256 indexed productId,
        uint256 newStock
    );
    
    // ✨ NEW EVENT
    event PriceUpdated(
        uint256 indexed productId,
        uint256 oldPrice,
        uint256 newPrice
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
    
    constructor(address _fitTokenAddress, address _treasury) {
        owner = msg.sender;
        fitTokenAddress = _fitTokenAddress;
        fitToken = IHRC20(_fitTokenAddress);
        treasury = _treasury;
    }
    
    // ====================================================
    // CORE FUNCTIONS
    // ====================================================
    
    /**
     * @notice Purchase a product with FIT tokens
     * @param productId Product to purchase
     * @param quantity Number of items (currently always 1)
     */
    function purchaseProduct(uint256 productId, uint256 quantity) external returns (uint256) {
        require(quantity > 0, "Quantity must be positive");
        require(productId > 0 && productId <= productCount, "Invalid product");
        
        Product storage product = products[productId];
        require(product.isActive, "Product not active");
        require(product.stock >= quantity, "Insufficient stock");
        
        uint256 totalCost = product.priceTokens * quantity;
        
        // Transfer FIT tokens from buyer to treasury
        require(
            fitToken.transferFrom(msg.sender, treasury, totalCost),
            "Token transfer failed"
        );
        
        // Update stock
        product.stock -= quantity;
        emit StockUpdated(productId, product.stock);
        
        // Mint NFT receipt
        nftCount++;
        
        string memory metadata = string(abi.encodePacked(
            '{"productId":', _uint2str(productId),
            ',"productName":"', product.name,
            '","quantity":', _uint2str(quantity),
            ',"price":', _uint2str(totalCost),
            '}'
        ));
        
        nfts[nftCount] = NFT({
            id: nftCount,
            productId: productId,
            owner: msg.sender,
            purchaseDate: block.timestamp,
            isUsed: false,
            usedDate: 0,
            metadata: metadata
        });
        
        userNFTs[msg.sender].push(nftCount);
        
        emit NFTPurchased(
            msg.sender,
            nftCount,
            productId,
            totalCost,
            block.timestamp
        );
        
        return nftCount;
    }
    
    /**
     * @notice Mark NFT as used (when QR code scanned)
     * @param nftId NFT ID to mark as used
     */
    function markNFTUsed(uint256 nftId) external onlyOwner {
        require(nftId > 0 && nftId <= nftCount, "Invalid NFT");
        require(!nfts[nftId].isUsed, "NFT already used");
        
        nfts[nftId].isUsed = true;
        nfts[nftId].usedDate = block.timestamp;
        
        emit NFTUsed(nftId, block.timestamp);
    }
    
    // ====================================================
    // ADMIN FUNCTIONS
    // ====================================================
    
    /**
     * @notice Add a new product
     * @param name Product name
     * @param description Product description
     * @param category Product category
     * @param priceTokens Price in FIT tokens
     * @param stock Initial stock
     * @param imageUrl Image URL
     */
    function addProduct(
        string memory name,
        string memory description,
        string memory category,
        uint256 priceTokens,
        uint256 stock,
        string memory imageUrl
    ) external onlyOwner {
        productCount++;
        
        products[productCount] = Product({
            id: productCount,
            name: name,
            description: description,
            category: category,
            priceTokens: priceTokens,
            stock: stock,
            imageUrl: imageUrl,
            isActive: true
        });
        
        emit ProductAdded(productCount, name, priceTokens);
    }
    
    /**
     * ✨ NEW FUNCTION: Update product price
     * @notice Update the price of an existing product
     * @param productId Product ID
     * @param newPrice New price in FIT tokens
     */
    function updatePrice(uint256 productId, uint256 newPrice) external onlyOwner {
        require(productId > 0 && productId <= productCount, "Invalid product");
        
        uint256 oldPrice = products[productId].priceTokens;
        products[productId].priceTokens = newPrice;
        
        emit PriceUpdated(productId, oldPrice, newPrice);
    }
    
    /**
     * @notice Update product stock
     * @param productId Product ID
     * @param newStock New stock amount
     */
    function updateStock(uint256 productId, uint256 newStock) external onlyOwner {
        require(productId > 0 && productId <= productCount, "Invalid product");
        products[productId].stock = newStock;
        emit StockUpdated(productId, newStock);
    }
    
    /**
     * @notice Deactivate a product
     * @param productId Product ID
     */
    function deactivateProduct(uint256 productId) external onlyOwner {
        require(productId > 0 && productId <= productCount, "Invalid product");
        products[productId].isActive = false;
    }
    
    /**
     * @notice Activate a product
     * @param productId Product ID
     */
    function activateProduct(uint256 productId) external onlyOwner {
        require(productId > 0 && productId <= productCount, "Invalid product");
        products[productId].isActive = true;
    }
    
    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }
    
    // ====================================================
    // VIEW FUNCTIONS
    // ====================================================
    
    /**
     * @notice Get product details
     * @param productId Product ID
     * @return Product struct
     */
    function getProduct(uint256 productId) external view returns (Product memory) {
        require(productId > 0 && productId <= productCount, "Invalid product");
        return products[productId];
    }
    
    /**
     * @notice Get NFT details
     * @param nftId NFT ID
     * @return NFT struct
     */
    function getNFT(uint256 nftId) external view returns (NFT memory) {
        require(nftId > 0 && nftId <= nftCount, "Invalid NFT");
        return nfts[nftId];
    }
    
    /**
     * ✨ NEW FUNCTION: Get total NFT count
     * @notice Get the total number of NFTs minted
     * @return Total NFT count
     */
    function getNFTCount() external view returns (uint256) {
        return nftCount;
    }
    
    /**
     * @notice Get NFT owner
     * @param nftId NFT ID
     * @return Owner address
     */
    function getNFTOwner(uint256 nftId) external view returns (address) {
        require(nftId > 0 && nftId <= nftCount, "Invalid NFT");
        return nfts[nftId].owner;
    }
    
    /**
     * @notice Check if NFT is used
     * @param nftId NFT ID
     * @return True if used
     */
    function isNFTUsed(uint256 nftId) external view returns (bool) {
        require(nftId > 0 && nftId <= nftCount, "Invalid NFT");
        return nfts[nftId].isUsed;
    }
    
    /**
     * @notice Get all NFTs owned by user
     * @param user User address
     * @return Array of NFT IDs
     */
    function getUserNFTs(address user) external view returns (uint256[] memory) {
        return userNFTs[user];
    }
    
    // ====================================================
    // UTILITY FUNCTIONS
    // ====================================================
    
    /**
     * @notice Convert uint to string
     * @param _i Uint to convert
     * @return String representation
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
