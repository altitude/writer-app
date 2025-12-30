// Common English words sorted roughly by frequency
// This is a curated list of ~500 common words for autocomplete
export const WORD_LIST: string[] = [
  // Articles, pronouns, prepositions (most common)
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
  "at", "by", "for", "with", "about", "against", "between", "into", "through", "during",
  "before", "after", "above", "below", "to", "from", "up", "down", "in", "out",
  "on", "off", "over", "under", "again", "further", "once", "here", "there", "where",
  "why", "how", "all", "each", "few", "more", "most", "other", "some", "such",
  "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "just", "also", "now", "even", "still", "already", "always", "never", "often", "sometimes",
  
  // Pronouns
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves",
  "you", "your", "yours", "yourself", "yourselves",
  "he", "him", "his", "himself", "she", "her", "hers", "herself",
  "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
  "what", "which", "who", "whom", "this", "that", "these", "those",
  
  // Common verbs
  "be", "been", "being", "am", "is", "are", "was", "were",
  "have", "has", "had", "having", "do", "does", "did", "doing", "done",
  "will", "would", "could", "should", "may", "might", "must", "shall",
  "can", "cannot", "need", "dare", "ought", "used",
  "say", "said", "says", "saying",
  "get", "got", "gets", "getting", "gotten",
  "make", "made", "makes", "making",
  "go", "goes", "went", "going", "gone",
  "know", "knew", "knows", "knowing", "known",
  "think", "thought", "thinks", "thinking",
  "take", "took", "takes", "taking", "taken",
  "see", "saw", "sees", "seeing", "seen",
  "come", "came", "comes", "coming",
  "want", "wanted", "wants", "wanting",
  "look", "looked", "looks", "looking",
  "use", "used", "uses", "using",
  "find", "found", "finds", "finding",
  "give", "gave", "gives", "giving", "given",
  "tell", "told", "tells", "telling",
  "work", "worked", "works", "working",
  "call", "called", "calls", "calling",
  "try", "tried", "tries", "trying",
  "ask", "asked", "asks", "asking",
  "feel", "felt", "feels", "feeling",
  "become", "became", "becomes", "becoming",
  "leave", "left", "leaves", "leaving",
  "put", "puts", "putting",
  "mean", "meant", "means", "meaning",
  "keep", "kept", "keeps", "keeping",
  "let", "lets", "letting",
  "begin", "began", "begins", "beginning", "begun",
  "seem", "seemed", "seems", "seeming",
  "help", "helped", "helps", "helping",
  "show", "showed", "shows", "showing", "shown",
  "hear", "heard", "hears", "hearing",
  "play", "played", "plays", "playing",
  "run", "ran", "runs", "running",
  "move", "moved", "moves", "moving",
  "live", "lived", "lives", "living",
  "believe", "believed", "believes", "believing",
  "bring", "brought", "brings", "bringing",
  "happen", "happened", "happens", "happening",
  "write", "wrote", "writes", "writing", "written",
  "provide", "provided", "provides", "providing",
  "sit", "sat", "sits", "sitting",
  "stand", "stood", "stands", "standing",
  "lose", "lost", "loses", "losing",
  "pay", "paid", "pays", "paying",
  "meet", "met", "meets", "meeting",
  "include", "included", "includes", "including",
  "continue", "continued", "continues", "continuing",
  "set", "sets", "setting",
  "learn", "learned", "learns", "learning",
  "change", "changed", "changes", "changing",
  "lead", "led", "leads", "leading",
  "understand", "understood", "understands", "understanding",
  "watch", "watched", "watches", "watching",
  "follow", "followed", "follows", "following",
  "stop", "stopped", "stops", "stopping",
  "create", "created", "creates", "creating",
  "speak", "spoke", "speaks", "speaking", "spoken",
  "read", "reads", "reading",
  "spend", "spent", "spends", "spending",
  "grow", "grew", "grows", "growing", "grown",
  "open", "opened", "opens", "opening",
  "walk", "walked", "walks", "walking",
  "win", "won", "wins", "winning",
  "offer", "offered", "offers", "offering",
  "remember", "remembered", "remembers", "remembering",
  "love", "loved", "loves", "loving",
  "consider", "considered", "considers", "considering",
  "appear", "appeared", "appears", "appearing",
  "buy", "bought", "buys", "buying",
  "wait", "waited", "waits", "waiting",
  "serve", "served", "serves", "serving",
  "die", "died", "dies", "dying",
  "send", "sent", "sends", "sending",
  "expect", "expected", "expects", "expecting",
  "build", "built", "builds", "building",
  "stay", "stayed", "stays", "staying",
  "fall", "fell", "falls", "falling", "fallen",
  "cut", "cuts", "cutting",
  "reach", "reached", "reaches", "reaching",
  "kill", "killed", "kills", "killing",
  "remain", "remained", "remains", "remaining",
  
  // Common nouns
  "time", "year", "people", "way", "day", "man", "woman", "child", "children",
  "world", "life", "hand", "part", "place", "case", "week", "company", "system",
  "program", "question", "work", "government", "number", "night", "point", "home",
  "water", "room", "mother", "area", "money", "story", "fact", "month", "lot",
  "right", "study", "book", "eye", "job", "word", "business", "issue", "side",
  "kind", "head", "house", "service", "friend", "father", "power", "hour", "game",
  "line", "end", "member", "law", "car", "city", "community", "name", "president",
  "team", "minute", "idea", "body", "information", "back", "parent", "face",
  "others", "level", "office", "door", "health", "person", "art", "war", "history",
  "party", "result", "change", "morning", "reason", "research", "girl", "guy",
  "moment", "air", "teacher", "force", "education", "foot", "boy", "age", "policy",
  "process", "music", "market", "sense", "nation", "plan", "college", "interest",
  "death", "experience", "effect", "use", "class", "control", "care", "field",
  "development", "role", "effort", "rate", "heart", "drug", "show", "leader",
  "light", "voice", "wife", "police", "mind", "difference", "period", "building",
  "action", "authority", "model", "century", "evidence", "value", "decision",
  "language", "love", "truth", "nothing", "everything", "something", "anything",
  
  // Common adjectives
  "good", "new", "first", "last", "long", "great", "little", "own", "other",
  "old", "right", "big", "high", "different", "small", "large", "next", "early",
  "young", "important", "few", "public", "bad", "same", "able", "human", "local",
  "sure", "free", "better", "best", "true", "full", "special", "easy", "clear",
  "recent", "certain", "personal", "open", "red", "difficult", "available", "likely",
  "short", "single", "medical", "current", "wrong", "private", "past", "foreign",
  "fine", "common", "poor", "natural", "significant", "similar", "hot", "dead",
  "central", "happy", "serious", "ready", "simple", "left", "physical", "general",
  "environmental", "financial", "blue", "democratic", "dark", "various", "entire",
  "close", "legal", "religious", "cold", "final", "main", "green", "nice", "huge",
  "popular", "traditional", "cultural", "beautiful", "strong", "whole", "possible",
  "impossible", "necessary", "real", "perfect", "complete", "wonderful", "terrible",
  "strange", "quiet", "loud", "soft", "hard", "fast", "slow", "deep", "wide",
  "narrow", "thin", "thick", "empty", "heavy", "light", "bright", "wild", "gentle",
  
  // Time words
  "today", "tomorrow", "yesterday", "tonight", "morning", "afternoon", "evening",
  "midnight", "noon", "monday", "tuesday", "wednesday", "thursday", "friday",
  "saturday", "sunday", "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
  
  // Numbers as words
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
  "eighty", "ninety", "hundred", "thousand", "million", "billion",
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
  
  // Writing-specific words
  "chapter", "paragraph", "sentence", "character", "scene", "plot", "dialogue",
  "narrator", "protagonist", "antagonist", "setting", "theme", "conflict",
  "resolution", "climax", "beginning", "middle", "ending", "story", "novel",
  "fiction", "nonfiction", "poetry", "prose", "narrative", "description",
  "suddenly", "meanwhile", "however", "therefore", "furthermore", "moreover",
  "nevertheless", "although", "because", "since", "unless", "until", "while",
  "perhaps", "maybe", "probably", "certainly", "definitely", "possibly",
  "apparently", "obviously", "clearly", "simply", "exactly", "completely",
  "actually", "really", "truly", "finally", "eventually", "immediately",
  "quickly", "slowly", "carefully", "quietly", "softly", "gently", "suddenly",
];

// Get suggestions for a given prefix
export function getSuggestions(prefix: string, limit: number = 3): string[] {
  if (!prefix || prefix.length === 0) return [];
  
  const lowerPrefix = prefix.toLowerCase();
  const matches: string[] = [];
  const seen = new Set<string>();
  
  for (const word of WORD_LIST) {
    if (word.startsWith(lowerPrefix) && word !== lowerPrefix && !seen.has(word)) {
      seen.add(word);
      matches.push(word);
      if (matches.length >= limit) break;
    }
  }
  
  return matches;
}

