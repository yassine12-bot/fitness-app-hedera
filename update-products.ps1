# PowerShell script to update products.js

$filePath = "src\api\marketplace\products.js"
$content = Get-Content -Path $filePath -Raw

# Replace lines 36-46
$oldLines = @"
    let query = 'SELECT * FROM products WHERE stock > 0';
    let params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, priceTokens ASC';
    
    const products = await db.all(query, params);
"@

$newLines = @"
    // Query smart contract for products
    const productCount = await marketplaceContract.getProductCount();
    const products = [];
    
    for (let i = 1; i <= productCount; i++) {
      const product = await marketplaceContract.getProduct(i);
      
      // Filter: only active products with stock
      if (product.isActive && product.stock > 0) {
        // Apply category filter if specified
        if (!category || product.category === category) {
          products.push(product);
        }
      }
    }
    
    // Sort by category and price (same as before)
    products.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.priceTokens - b.priceTokens;
    });
"@

$content = $content.Replace($oldLines, $newLines)
Set-Content -Path $filePath -Value $content

Write-Host "✅ Products API updated!" -ForegroundColor Green
