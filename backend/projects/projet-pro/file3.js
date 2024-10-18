
function genererNombreAleatoire(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Exemple d'utilisation : générer un nombre aléatoire entre 1 et 100
const nombreAleatoire = genererNombreAleatoire(1, 100);
console.log(nombreAleatoire);