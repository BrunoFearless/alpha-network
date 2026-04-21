
const axios = require('axios');

async function testGallery() {
  const API_URL = 'http://localhost:3001/api/v1';
  try {
    console.log('Testing Gallery API...');
    const res = await axios.get(`${API_URL}/lazer/discover/gallery`, {
      params: { q: 'anime', page: 1 }
    });
    console.log('Status:', res.status);
    console.log('Result Type:', typeof res.data);
    console.log('Is Array:', Array.isArray(res.data));
    console.log('Item Count:', res.data.length);
    if (res.data.length > 0) {
       console.log('First Item:', res.data[0]);
    }
  } catch (e) {
    console.error('Error:', e.message);
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Data:', e.response.data);
    }
  }
}

testGallery();
