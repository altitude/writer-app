// AST types for structured document representation

export interface WordToken {
  type: 'word';
  text: string;
  charStart: number;
  charEnd: number;
}

export interface SeparatorToken {
  type: 'separator';
  text: string;
  charStart: number;
  charEnd: number;
}

export type Token = WordToken | SeparatorToken;

export interface Sentence {
  index: number;
  tokens: Token[];
  charStart: number;
  charEnd: number; // Exclusive (position after last char of sentence, not including trailing space)
}

export interface DocumentAST {
  text: string;
  sentences: Sentence[];
  words: WordToken[];
}

const WORD_SEPARATORS = /^[ ,;.?!\n—()]+$/;
const SENTENCE_END = /[.?!]/;

/**
 * Parse text into a structured document AST
 */
export function parseDocument(text: string): DocumentAST {
  const tokens = tokenize(text);
  const sentences = buildSentences(tokens, text);
  const words = tokens.filter((t): t is WordToken => t.type === 'word');
  
  return { text, sentences, words };
}

/**
 * Tokenize text into words and separators
 */
function tokenize(text: string): Token[] {
  const parts = text.split(/([ ,;.?!\n—()]+)/);
  const tokens: Token[] = [];
  let charIndex = 0;
  
  for (const part of parts) {
    if (part.length === 0) continue;
    
    const isSeparator = WORD_SEPARATORS.test(part);
    tokens.push({
      type: isSeparator ? 'separator' : 'word',
      text: part,
      charStart: charIndex,
      charEnd: charIndex + part.length,
    });
    charIndex += part.length;
  }
  
  return tokens;
}

/**
 * Group tokens into sentences based on sentence-ending punctuation
 */
function buildSentences(tokens: Token[], text: string): Sentence[] {
  const sentences: Sentence[] = [];
  let currentTokens: Token[] = [];
  let sentenceStart = 0;
  let sentenceIndex = 0;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    currentTokens.push(token);
    
    // Check if this token ends a sentence (separator containing .?! followed by space/newline or end)
    if (token.type === 'separator') {
      const endsWithSentenceEnd = SENTENCE_END.test(token.text);
      const isEndOfText = i === tokens.length - 1;
      const nextIsSpaceOrNewline = !isEndOfText && (
        token.text.includes(' ') || token.text.includes('\n') || 
        /[\s\n]/.test(token.text.slice(-1))
      );
      
      if (endsWithSentenceEnd && (isEndOfText || nextIsSpaceOrNewline || token.text.length > 1)) {
        // Find where the sentence actually ends (after punctuation, before trailing space)
        let sentenceEnd = token.charEnd;
        
        // If separator has trailing space after punctuation, exclude it
        const punctMatch = token.text.match(/[.?!]/);
        if (punctMatch) {
          const punctIndex = token.text.lastIndexOf(punctMatch[0]);
          sentenceEnd = token.charStart + punctIndex + 1;
        }
        
        sentences.push({
          index: sentenceIndex++,
          tokens: currentTokens,
          charStart: sentenceStart,
          charEnd: sentenceEnd,
        });
        
        // Start new sentence after the space (if any)
        sentenceStart = token.charEnd;
        currentTokens = [];
      }
    }
  }
  
  // Handle remaining tokens as final sentence
  if (currentTokens.length > 0) {
    sentences.push({
      index: sentenceIndex,
      tokens: currentTokens,
      charStart: sentenceStart,
      charEnd: text.length,
    });
  }
  
  return sentences;
}

// ============ Query helpers ============

/**
 * Find the sentence at a given character position
 */
export function getSentenceAtPosition(ast: DocumentAST, pos: number): Sentence | null {
  for (const sentence of ast.sentences) {
    if (pos >= sentence.charStart && pos < sentence.charEnd) {
      return sentence;
    }
    // Handle position in space between sentences
    if (pos >= sentence.charEnd && ast.sentences[sentence.index + 1]?.charStart > pos) {
      return sentence;
    }
  }
  // If at end, return last sentence
  if (pos >= ast.text.length && ast.sentences.length > 0) {
    return ast.sentences[ast.sentences.length - 1];
  }
  return ast.sentences[0] ?? null;
}

/**
 * Find the sentence index at a given character position
 */
export function getSentenceIndexAtPosition(ast: DocumentAST, pos: number): number {
  const sentence = getSentenceAtPosition(ast, pos);
  return sentence?.index ?? 0;
}

/**
 * Find the word at or near a given character position
 */
export function getWordAtPosition(ast: DocumentAST, pos: number): WordToken | null {
  for (const word of ast.words) {
    if (pos >= word.charStart && pos <= word.charEnd) {
      return word;
    }
  }
  // Find nearest word before position
  for (let i = ast.words.length - 1; i >= 0; i--) {
    if (ast.words[i].charEnd <= pos) {
      return ast.words[i];
    }
  }
  return ast.words[0] ?? null;
}

/**
 * Find the word index at a given character position
 */
export function getWordIndexAtPosition(ast: DocumentAST, pos: number): number {
  for (let i = 0; i < ast.words.length; i++) {
    const word = ast.words[i];
    if (pos >= word.charStart && pos <= word.charEnd) {
      return i;
    }
    if (pos < word.charStart) {
      return Math.max(0, i);
    }
  }
  return Math.max(0, ast.words.length - 1);
}

/**
 * Get character range for a word selection (by word indices)
 */
export function getWordSelectionRange(
  ast: DocumentAST,
  selection: { start: number; end: number }
): { start: number; end: number } {
  const minIdx = Math.min(selection.start, selection.end);
  const maxIdx = Math.max(selection.start, selection.end);
  
  const startWord = ast.words[minIdx];
  const endWord = ast.words[maxIdx];
  
  if (!startWord || !endWord) {
    return { start: 0, end: 0 };
  }
  
  return {
    start: startWord.charStart,
    end: endWord.charEnd,
  };
}

/**
 * Get character range for a sentence selection (by sentence indices)
 */
export function getSentenceSelectionRange(
  ast: DocumentAST,
  selection: { start: number; end: number }
): { start: number; end: number } {
  const minIdx = Math.min(selection.start, selection.end);
  const maxIdx = Math.max(selection.start, selection.end);
  
  const startSentence = ast.sentences[minIdx];
  const endSentence = ast.sentences[maxIdx];
  
  if (!startSentence || !endSentence) {
    return { start: 0, end: ast.text.length };
  }
  
  return {
    start: startSentence.charStart,
    end: endSentence.charEnd,
  };
}

/**
 * Check if a character position is within a selected sentence range
 */
export function isCharInSelectedSentences(
  ast: DocumentAST,
  charPos: number,
  selection: { start: number; end: number }
): boolean {
  const minIdx = Math.min(selection.start, selection.end);
  const maxIdx = Math.max(selection.start, selection.end);
  
  for (let i = minIdx; i <= maxIdx; i++) {
    const sentence = ast.sentences[i];
    if (sentence && charPos >= sentence.charStart && charPos < sentence.charEnd) {
      return true;
    }
  }
  return false;
}

