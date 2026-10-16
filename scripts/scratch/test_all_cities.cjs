const https = require('https');

const targetCities = [
  "Cebu City",
  "Mandaue City",
  "Talisay City",
  "City of Naga", // OSM often names Naga as "City of Naga" or "Naga"
  "Consolacion",
  "Liloan",
  "Minglanilla",
  "San Fernando"
];

async function queryCity(cityName) {
  const query = `
[out:json][timeout:30];
area["name"~"${cityName}"]->.a;
(
  node["place"~"suburb|village|neighbourhood|quarter|town"](area.a);
  relation["admin_level"~"9|10"](area.a);
  way["admin_level"~"9|10"](area.a);
);
out center tags;
`;
  const postData = 'data=' + encodeURIComponent(query);
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'overpass-api.de',
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WatchCebu/1.0 (civic app)'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ city: cityName, elements: json.elements || [] });
        } catch (e) {
          resolve({ city: cityName, elements: [] });
        }
      });
    });
    req.on('error', () => resolve({ city: cityName, elements: [] }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  for (const c of targetCities) {
    const res = await queryCity(c);
    console.log(`${c}: ${res.elements.length} elements`);
    // wait 1 sec between queries to respect Overpass rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
}

run();
