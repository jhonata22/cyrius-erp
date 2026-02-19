// frontend/src/utils/urlUtils.js

/**
 * Formata uma URL de imagem completa para um caminho relativo.
 * Remove o protocolo e o domínio (ex: http://192.168.0.1:8000/media/foto.jpg se torna /media/foto.jpg),
 * permitindo que o navegador resolva o caminho a partir do domínio atual.
 * Isso é crucial para que as imagens funcionem tanto em ambiente local quanto em produção.
 * 
 * @param {string} url - A URL da imagem vinda do backend.
 * @returns {string|null} A URL formatada como caminho relativo, ou null se a entrada for inválida.
 */
export const formatImgUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Se a URL já for um caminho relativo (começa com /), não faz nada.
  if (url.startsWith('/')) {
    return url;
  }

  // Se for uma URL completa, extrai o caminho.
  if (url.startsWith('http')) {
    try {
      const urlObject = new URL(url);
      return urlObject.pathname; // Retorna apenas o caminho (ex: /media/foto.jpg)
    } catch (error) {
      // Se a URL for inválida, tenta uma abordagem mais simples de substituição
      // como fallback, igual a que existia em Perfil.jsx
      return url.replace(/^https?:\/\/[^/]+/, '');
    }
  }

  // Se não for um formato esperado, retorna a URL original.
  return url;
};
