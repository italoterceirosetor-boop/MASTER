// Serviço de chat - integra com API iacontaai (compatível OpenAI)
import axios from 'axios';

// Detecta se a mensagem precisa de busca na web
function needsWebSearch(message) {
  const keywords = [
    'preço', 'cotação', 'notícia', 'hoje', 'ontem', 'agora',
    'última', 'último', 'atual', '2024', '2025', '2026',
    'clima', 'tempo', 'dólar', 'euro', 'bitcoin',
    'pesquise', 'busque', 'procure', 'encontre',
    'quem é', 'o que é', 'como fazer'
  ];
  const lower = message.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// Chama Brave Search
async function braveSearch(query) {
  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: { q: query, count: 5 },
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': process.env.BRAVE_API_KEY
      }
    });

    const results = response.data.web?.results || [];
    return results.map(r => ({
      title: r.title,
      url: r.url,
      description: r.description
    }));
  } catch (err) {
    console.error('Erro no Brave Search:', err.message);
    return [];
  }
}

// Chama API iacontaai (compatível OpenAI)
export async function chatWithAI(messages, userMessage) {
  let enhancedMessages = [...messages];

  // Se precisar de busca na web, faz e injeta o contexto
  if (needsWebSearch(userMessage)) {
    const searchResults = await braveSearch(userMessage);

    if (searchResults.length > 0) {
      const context = searchResults.map((r, i) =>
        `[${i + 1}] ${r.title}\n${r.description}\nFonte: ${r.url}`
      ).join('\n\n');

      enhancedMessages = [
        {
          role: 'system',
          content: `Você é o Master IA, assistente especializado da Master Contabilidade. Use as informações de busca a seguir para responder de forma precisa e atualizada. Cite as fontes quando relevante.\n\nResultados da busca:\n${context}`
        },
        ...messages
      ];
    }
  }

  // System prompt padrão (caso não tenha busca)
  if (!enhancedMessages[0] || enhancedMessages[0].role !== 'system') {
    enhancedMessages = [
      {
        role: 'system',
        content: `Você é o Master IA, assistente inteligente da Master Contabilidade e Consultoria. Você é especializado em contabilidade, fiscal, tributário, folha de pagamento e assuntos empresariais. Seja claro, objetivo e profissional. Responda em português brasileiro.`
      },
      ...enhancedMessages
    ];
  }

  // Chama a API iacontaai
  const response = await axios.post(
    `${process.env.IACONTA_API_URL}/v1/chat/completions`,
    {
      model: process.env.IACONTA_MODEL || 'opus-4.8',
      messages: enhancedMessages,
      temperature: 0.7,
      max_tokens: 4096
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.IACONTA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.choices[0].message.content;
}
