const fetch = require('node-fetch');

async function testSeaArt() {
  console.log('--- Alpha SeaArt Debugger ---');
  
  try {
    // 1. Tourist Login
    console.log('Step 1: Attempting Tourist Login...');
    const loginRes = await fetch('https://www.seaart.ai/api/v1/user/tourist_login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Id': '100' },
      body: JSON.stringify({ device_id: `alpha_debug_${Math.random().toString(36).substring(7)}` })
    });
    
    const loginData = await loginRes.json();
    console.log('Login Response Code:', loginData.code);
    
    if (loginData.code !== 0) {
      console.error('Login Failed!', loginData);
      return;
    }
    
    const token = loginData.data.token;
    console.log('Token Obtained:', token.substring(0, 10) + '...');

    // 2. Search Test (Modern Anime Girl)
    console.log('\nStep 2: Attempting Search...');
    const searchRes = await fetch('https://www.seaart.ai/api/v1/common/get_work_list', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-App-Id': '100',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ keywords: 'modern anime girl streetwear', page: 1, page_size: 10, order_by: 'hot' })
    });
    
    const searchData = await searchRes.json();
    console.log('Search Response Code:', searchData.code);
    
    if (searchData.data) {
       const keys = Object.keys(searchData.data);
       console.log('Data keys:', keys);
       const items = searchData.data.items || searchData.data.list || searchData.data.works || [];
       console.log('Items found:', items.length);
       if (items.length > 0) {
         console.log('First item sample:', JSON.stringify(items[0]).substring(0, 200));
       }
    } else {
       console.log('Full response:', JSON.stringify(searchData));
    }

  } catch (e) {
    console.error('CATASTROPHIC ERROR:', e.message);
  }
}

testSeaArt();
