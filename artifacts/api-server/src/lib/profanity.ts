// Daftar kata kotor — hanya kata lengkap yang dicocokkan (whole-word match)
// Tidak boleh ada kata pendek yang jadi substring dari kata biasa
const PROFANITY_LIST = [
  // Indonesia — kata kasar jelas, hindari yang jadi substring kata umum
  "anjing","anjir","bangsat","babi","bajingan","goblok","tolol","bodoh",
  "kampret","keparat","kontol","memek","jancok","jancuk","dancuk","sialan",
  "ngentot","entot","ngewe","pepek","titit","mampus","tempik","puki",
  "pukimak","kimak","lancau","sundal","pelacur","jalang","lonte","bejat",
  "monyet","bajigur","brengsek","berengsek","kurang ajar","setan","iblis",
  "bacot","matamu","celeng","goblog","blegug","tetek","pantat",
  "jembut","peler","taek",
  // Jawa
  "matane","pukimai",
  // Inggris — hindari yang terlalu pendek
  "fuck","fck","shit","bitch","bastard","asshole","cunt","pussy",
  "whore","slut","nigga","nigger","faggot","retard","dumbass",
  "motherfucker","bullshit","jackass","dickhead","shithead",
  // Spanyol
  "puta","mierda","joder","pendejo","cabron","chinga","hostia",
  // Portugis
  "merda","porra","caralho","buceta","viado",
  // Prancis
  "merde","putain","connard","salope","bordel","enculer",
  // Jerman
  "scheiße","scheisse","arschloch","wichser","hurensohn","fotze","schlampe",
  // Rusia (latin)
  "blyad","pizda","ebat","pizdec",
  // Korea (latin)
  "sibal","ssibal","gaesekki",
  // Arab (latin)
  "sharmouta","kuss","kossomak",
];

// Normalisasi: lowercase, ganti karakter l33tspeak umum
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .trim();
}

// Pisahkan teks jadi kata-kata (split by non-alphanumeric)
function tokenize(text: string): string[] {
  return normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
}

export function containsProfanity(message: string): boolean {
  const words = tokenize(message);
  const fullNorm = normalize(message);

  for (const bad of PROFANITY_LIST) {
    const normalBad = normalize(bad);

    // Multi-kata (misal "kurang ajar") — cek di teks penuh
    if (bad.includes(" ")) {
      if (fullNorm.includes(normalBad)) return true;
      continue;
    }

    // Kata tunggal — hanya cocok jika persis sama dengan salah satu token
    if (words.includes(normalBad)) return true;
  }

  return false;
}
