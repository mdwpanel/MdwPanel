// Daftar kata kotor multi-bahasa (Indonesia, Inggris, dll)
const PROFANITY_LIST = [
  // Indonesia & daerah
  "anjing","anjir","anj","bangsat","babi","bajingan","goblok","tolol","idiot",
  "bodoh","kampret","keparat","tai","kontol","memek","jancok","cok","jancuk",
  "dancuk","asu","celeng","brengsek","bedebah","setan","iblis","sialan",
  "ngentot","entot","ngewe","pepek","titit","bacot","mampus","matamu",
  "tempik","puki","pukimak","kimak","lancau","sundal","pelacur","jalang",
  "lonte","bejat","monyet","bajigur","coblo","sempak","blo'on","dongok",
  "berengsek","kurang ajar","keparat","brengsek","sial","tetek","pantat",
  // Jawa
  "jancuk","jancok","dancuk","jangkrik","asu","celeng","bajingan","pukimai",
  "matane","taek","jembut","peler",
  // Sunda
  "sia","maneh","goblog","belegug","heureuy",
  // Inggris
  "fuck","f*ck","fck","fuuck","shit","sh*t","bitch","b*tch","bastard",
  "asshole","ass","a**","cunt","c*nt","dick","d*ck","pussy","p*ssy",
  "whore","slut","nigga","nigger","fag","faggot","retard","stupid",
  "idiot","moron","dumbass","motherfucker","mf","wtf","stfu","damn",
  "hell","crap","piss","cock","bollocks",
  // Spanyol
  "puta","mierda","joder","coño","pendejo","cabron","chinga","hostia",
  // Portugis
  "merda","porra","foda","caralho","buceta","viado","puta",
  // Arab
  "كس","طيز","شرموط","عرص","كلب","حمار","منيوك",
  // Mandarin (pinyin)
  "cao","tamade","shabi","hundan","wocao","niubi",
  // Prancis
  "merde","putain","connard","salope","bordel","enculer",
  // Jerman
  "scheiße","scheisse","arschloch","wichser","hurensohn","fotze","schlampe",
  // Rusia (latin)
  "blyad","pizda","huy","ebat","suka","pizdec","blya",
  // Jepang (romaji)
  "kuso","chikushо","baka","aho","shine",
  // Korea (latin)
  "sibal","ssibal","byeong","gaesekki","jiral",
  // Melayu
  "pukimak","celaka","sial","babi","pundi","pucuk","cipap",
];

// Normalisasi teks: hapus spasi & karakter khusus, lowercase
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*@#$!0-9]/g, (c) => ({
      "*": "", "@": "a", "#": "h", "$": "s", "!": "i",
      "0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
    }[c] ?? ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function containsProfanity(message: string): boolean {
  const normalized = normalize(message);
  const words = normalized.split(/\s+/);
  for (const bad of PROFANITY_LIST) {
    const normalBad = normalize(bad);
    if (normalized.includes(normalBad)) return true;
    if (words.some(w => w === normalBad)) return true;
  }
  return false;
}
