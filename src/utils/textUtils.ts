export const formatTitleCase = (text: string): string => {
  if (!text) return text;
  
  // Lista de conectores que devem permanecer em minúsculo (exceto no início da frase)
  const exceptions = [
    'da','do','de','e','das','dos','com','por','para','na','no','nas','nos','em',
    'a','as','o','os','ao','aos','à','às'
  ];
  
  // Divide o texto por espaços
  const words = text.toLowerCase().split(' ');
  
  const formattedWords = words.map((word, index) => {
    if (!word) return word; // Mantém espaços extras se houver
    
    // Sempre capitaliza a primeira palavra
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    
    // Verifica se é uma exceção (conector)
    if (exceptions.includes(word)) {
      return word;
    }
    
    // Caso contrário, capitaliza a primeira letra
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  
  return formattedWords.join(' ');
};

export const removeAccents = (text: string): string => {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const normalizeText = (text: string): string => {
  if (!text) return '';
  return removeAccents(text.toLowerCase().trim());
};
