import crypto from 'crypto';

/**
 * Gera uma senha temporaria criptograficamente segura.
 *
 * - 12 caracteres
 * - Contem letras maiusculas, minusculas, numeros e pelo menos 1 especial
 * - Exclui caracteres ambiguos (0, O, l, 1, I) para facilitar leitura
 *
 * A senha e retornada em texto plano UMA VEZ para exibicao no modal.
 * O Supabase Auth armazena apenas o hash — nao armazenar no banco do projeto.
 */
export function gerarSenhaTemporaria(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%';
  const all = upper + lower + digits + special;

  // Garantir pelo menos 1 de cada categoria
  const required = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];

  // Preencher os 8 restantes com o charset completo
  const remaining: string[] = [];
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    remaining.push(all[bytes[i] % all.length]);
  }

  // Combinar e embaralhar usando Fisher-Yates
  const chars = [...required, ...remaining];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
