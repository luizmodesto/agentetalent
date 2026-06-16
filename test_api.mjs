async function testApi() {
  try {
    const res = await fetch('http://localhost:3000/api/ai/process', { method: 'POST' });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testApi();
