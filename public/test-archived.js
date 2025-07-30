// Test script to add a product and then archive it to test the archived section
// This should be run in the browser console when the app is open

async function testArchivedProducts() {
  if (!window.api) {
    console.error('❌ window.api not available');
    return;
  }
  
  console.log('🧪 Testing archived products functionality...');
  
  try {
    // First, add a test product
    const testProduct = {
      name: 'Test Archived Product',
      buying_price: 100,
      stock: 5,
      brand: 'TestBrand',
      model: 'TestModel',
      currency: 'USD',
      category: 'phones'
    };
    
    console.log('📦 Adding test product...');
    const addResult = await window.api.addProduct(testProduct);
    console.log('✅ Add result:', addResult);
    
    // Get all products to find our test product
    const allProducts = await window.api.getAllProducts();
    const testProductAdded = allProducts.find(p => p.name === 'Test Archived Product');
    
    if (!testProductAdded) {
      console.error('❌ Test product not found after adding');
      return;
    }
    
    console.log('🔍 Found test product:', testProductAdded);
    
    // Now archive the test product
    const archivedProduct = {
      ...testProductAdded,
      archived: 1
    };
    
    console.log('🗂️ Archiving test product...');
    const editResult = await window.api.editProduct(archivedProduct);
    console.log('✅ Archive result:', editResult);
    
    // Verify it's archived
    const archivedProducts = await window.api.getArchivedProducts();
    console.log('📋 Archived products:', archivedProducts);
    
    const testArchivedProduct = archivedProducts.find(p => p.name === 'Test Archived Product');
    if (testArchivedProduct) {
      console.log('🎉 SUCCESS: Test product is now archived!', testArchivedProduct);
    } else {
      console.log('❌ FAILED: Test product not found in archived list');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export to global scope for easy testing
window.testArchivedProducts = testArchivedProducts;

console.log('🔧 Test function loaded. Run testArchivedProducts() in console to test archived products.');
