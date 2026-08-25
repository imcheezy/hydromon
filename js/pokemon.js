/* Gen 1 Pokédex data (#1-151): [name, primaryType]
   Sprites are fetched from the PokéAPI sprites CDN by dex number. */
const GEN1 = [
  ["Bulbasaur","grass"],["Ivysaur","grass"],["Venusaur","grass"],
  ["Charmander","fire"],["Charmeleon","fire"],["Charizard","fire"],
  ["Squirtle","water"],["Wartortle","water"],["Blastoise","water"],
  ["Caterpie","bug"],["Metapod","bug"],["Butterfree","bug"],
  ["Weedle","bug"],["Kakuna","bug"],["Beedrill","bug"],
  ["Pidgey","normal"],["Pidgeotto","normal"],["Pidgeot","normal"],
  ["Rattata","normal"],["Raticate","normal"],
  ["Spearow","normal"],["Fearow","normal"],
  ["Ekans","poison"],["Arbok","poison"],
  ["Pikachu","electric"],["Raichu","electric"],
  ["Sandshrew","ground"],["Sandslash","ground"],
  ["Nidoran♀","poison"],["Nidorina","poison"],["Nidoqueen","poison"],
  ["Nidoran♂","poison"],["Nidorino","poison"],["Nidoking","poison"],
  ["Clefairy","fairy"],["Clefable","fairy"],
  ["Vulpix","fire"],["Ninetales","fire"],
  ["Jigglypuff","normal"],["Wigglytuff","normal"],
  ["Zubat","poison"],["Golbat","poison"],
  ["Oddish","grass"],["Gloom","grass"],["Vileplume","grass"],
  ["Paras","bug"],["Parasect","bug"],
  ["Venonat","bug"],["Venomoth","bug"],
  ["Diglett","ground"],["Dugtrio","ground"],
  ["Meowth","normal"],["Persian","normal"],
  ["Psyduck","water"],["Golduck","water"],
  ["Mankey","fighting"],["Primeape","fighting"],
  ["Growlithe","fire"],["Arcanine","fire"],
  ["Poliwag","water"],["Poliwhirl","water"],["Poliwrath","water"],
  ["Abra","psychic"],["Kadabra","psychic"],["Alakazam","psychic"],
  ["Machop","fighting"],["Machoke","fighting"],["Machamp","fighting"],
  ["Bellsprout","grass"],["Weepinbell","grass"],["Victreebel","grass"],
  ["Tentacool","water"],["Tentacruel","water"],
  ["Geodude","rock"],["Graveler","rock"],["Golem","rock"],
  ["Ponyta","fire"],["Rapidash","fire"],
  ["Slowpoke","water"],["Slowbro","water"],
  ["Magnemite","electric"],["Magneton","electric"],
  ["Farfetch'd","normal"],
  ["Doduo","normal"],["Dodrio","normal"],
  ["Seel","water"],["Dewgong","water"],
  ["Grimer","poison"],["Muk","poison"],
  ["Shellder","water"],["Cloyster","water"],
  ["Gastly","ghost"],["Haunter","ghost"],["Gengar","ghost"],
  ["Onix","rock"],
  ["Drowzee","psychic"],["Hypno","psychic"],
  ["Krabby","water"],["Kingler","water"],
  ["Voltorb","electric"],["Electrode","electric"],
  ["Exeggcute","grass"],["Exeggutor","grass"],
  ["Cubone","ground"],["Marowak","ground"],
  ["Hitmonlee","fighting"],["Hitmonchan","fighting"],
  ["Lickitung","normal"],
  ["Koffing","poison"],["Weezing","poison"],
  ["Rhyhorn","ground"],["Rhydon","ground"],
  ["Chansey","normal"],
  ["Tangela","grass"],
  ["Kangaskhan","normal"],
  ["Horsea","water"],["Seadra","water"],
  ["Goldeen","water"],["Seaking","water"],
  ["Staryu","water"],["Starmie","water"],
  ["Mr. Mime","psychic"],
  ["Scyther","bug"],
  ["Jynx","ice"],
  ["Electabuzz","electric"],
  ["Magmar","fire"],
  ["Pinsir","bug"],
  ["Tauros","normal"],
  ["Magikarp","water"],["Gyarados","water"],
  ["Lapras","water"],
  ["Ditto","normal"],
  ["Eevee","normal"],["Vaporeon","water"],["Jolteon","electric"],["Flareon","fire"],
  ["Porygon","normal"],
  ["Omanyte","rock"],["Omastar","rock"],
  ["Kabuto","rock"],["Kabutops","rock"],
  ["Aerodactyl","rock"],
  ["Snorlax","normal"],
  ["Articuno","ice"],["Zapdos","electric"],["Moltres","fire"],
  ["Dratini","dragon"],["Dragonair","dragon"],["Dragonite","dragon"],
  ["Mewtwo","psychic"],["Mew","psychic"]
];

const POKEDEX = GEN1.map((p, i) => ({ id: i + 1, name: p[0], type: p[1] }));

/* Every type present in Gen 1, used to clear type tint classes off a card. */
const TYPES = POKEDEX.reduce(
  (acc, p) => (acc.indexOf(p.type) === -1 ? acc.concat(p.type) : acc),
  []
);

/* Grid sprites ship with the app (~600 KB for all 151) so the Pokedex works
   offline and never depends on a CDN. The big official artwork used in the
   discovery reveal is fetched on demand and falls back to the local sprite. */
const SPRITE_BASE = "sprites/";
const ARTWORK_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";

function spriteUrl(id) {
  return SPRITE_BASE + id + ".png";
}
function artworkUrl(id) {
  return ARTWORK_BASE + id + ".png";
}
