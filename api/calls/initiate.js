module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { customer_number, agent_number } = req.body || {};
  if (!customer_number) return res.status(400).json({ error: 'customer_number is required' });

  const params = new URLSearchParams({ auth: process.env.BUZZDIAL_AUTH, customer_number });
  if (agent_number) params.append('agent_number', agent_number);

  const response = await fetch(`https://buzzdial.io/api/clicktocall.php?${params}`);
  const data = await response.json();
  res.json(data);
};
