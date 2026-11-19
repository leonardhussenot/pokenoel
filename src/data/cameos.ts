import { FAMILY_PAIRS } from './familyAvatars';
import { CAMEO_COORDS } from './mapBuilder';
import { ModeId, NpcEntity } from '../types';

interface CameoScript {
  pair: ModeId;
  lines: [string, string, string]; // a, b, a
}

const CAMEO_SCRIPTS: Record<ModeId, Record<1 | 2 | 3, CameoScript>> = {
  pm: {
    1: {
      pair: 'df',
      lines: [
        'Coucou Pola & Marguerite ! On prend un café littéraire avant de filer écouter du choro !',
        'Méfiez-vous du Bateau ivre de Rimbaud, il tangue autant qu’un vieux film muet !',
        'Bonne chasse aux quatre premiers badges !',
      ],
    },
    2: {
      pair: 'jp',
      lines: [
        'Regarde cette lumière sur le Quartier des Romanciers, on dirait un cliché de Doisneau !',
        'Victor Hugo et Colette nous ont même donné faim avec leurs banquets littéraires.',
        'Courage pour les 8 badges, on croit en vous !',
      ],
    },
    3: {
      pair: 'aj',
      lines: [
        'Franchement, l’escrime de Cyrano sur le Boulevard des Théâtres, c’est aussi intense qu’un contre de Wembanyama !',
        'Gare aux feintes de Sarah Bernhardt… Elle a une réplique plus rapide qu’un dribble de Mbappé !',
        'Plus que quelques badges avant Molière !',
      ],
    },
  },
  df: {
    1: {
      pair: 'pm',
      lines: [
        'Soleil sur Copacabana ! Le piano de Chiquinha Gonzaga résonne jusqu’ici !',
        'Dominique & Francis, les numéros de Chaplin et Keaton demandent de sacrés réflexes.',
        'Ramenez-nous les quatre badges du quartier !',
      ],
    },
    2: {
      pair: 'jp',
      lines: [
        'Quelle ambiance sur Studio Boulevard ! J’ai déjà mitraillé toutes les étoiles du trottoir.',
        'Et moi je rêve d’une feijoada bien mijotée après les prises d’Humphrey Bogart !',
        'En route vers les 8 badges, les champions !',
      ],
    },
    3: {
      pair: 'aj',
      lines: [
        'La Bossa Nova de Tom Jobim a presque autant de swing qu’un tir à 3 points de Curry !',
        'Mais attention à Hitchcock tout en haut, son suspense est plus tendu qu’une séance de tirs au but.',
        'Force à vous deux pour la dernière ligne droite !',
      ],
    },
  },
  jp: {
    1: {
      pair: 'pm',
      lines: [
        'Juliette & Pierre, ça sent le beurre chaud et la pellicule argentique à plein nez ici !',
        'Escoffier et Pierre Hermé ne plaisantent pas avec la précision des gestes.',
        'Bon appétit… et bonnes photos !',
      ],
    },
    2: {
      pair: 'df',
      lines: [
        'Entre la purée de Robuchon et la chambre noire d’Ansel Adams, on se croirait dans un grand classique !',
        'Prenez le temps d’admirer les ombres et lumières de Salgado.',
        'On vous retrouve vite au sommet, 8 badges en poche !',
      ],
    },
    3: {
      pair: 'aj',
      lines: [
        'L’Instant Décisif de Cartier-Bresson, c’est exactement comme déclencher un shoot au buzzer !',
        'Et attention à la brigade d’Alain Ducasse, ça file aussi vite qu’une contre-attaque.',
        'Cap sur Paul Bocuse !',
      ],
    },
  },
  aj: {
    1: {
      pair: 'pm',
      lines: [
        'Alexis & Joseph ! Quelle énergie sur les terrains de quartier !',
        'Entre les combinaisons de Tony Parker et les accélérations de Mbappé, on ne s’ennuie pas.',
        'Attrapez ces quatre premiers trophées !',
      ],
    },
    2: {
      pair: 'df',
      lines: [
        'Le jeu de jambes de Ronaldinho, c’est de la pure samba brésilienne sur gazon !',
        'Et la précision de Stephen Curry vaut bien le cadrage d’un grand réalisateur d’Hollywood.',
        'Allez chercher les 8 badges !',
      ],
    },
    3: {
      pair: 'jp',
      lines: [
        'On est venus photographier le Palais des Légendes… quel spectacle ici !',
        'Restez concentrés sur les contres de LeBron et les coups francs de Messi.',
        'Zizou vous attend au sommet !',
      ],
    },
  },
};

export function buildCameosForWorld(modeId: ModeId): NpcEntity[] {
  const overworldId = `${modeId}_overworld`;
  const scripts = CAMEO_SCRIPTS[modeId];
  return ([1, 2, 3] as const).map((district) => {
    const script = scripts[district];
    const visitingPair = FAMILY_PAIRS[script.pair];
    const [memA, memB] = visitingPair.members;
    const coord = CAMEO_COORDS[district];
    return {
      id: `${modeId}_cameo_${district}`,
      name: visitingPair.label,
      title: `Caméo — ${visitingPair.shortCode}`,
      role: 'cameo',
      district,
      mapId: overworldId,
      x: coord.x,
      y: coord.y,
      dir: 'down',
      appearance: memA.appearance,
      portrait: memA.portrait,
      voicePitch: memA.voicePitch,
      partnerName: memB.name,
      partnerAppearance: memB.appearance,
      partnerPortrait: memB.portrait,
      cameoPairCode: script.pair,
      cameoLines: [
        { speaker: memA.name, portraitOwner: 'a', text: script.lines[0] },
        { speaker: memB.name, portraitOwner: 'b', text: script.lines[1] },
        { speaker: memA.name, portraitOwner: 'a', text: script.lines[2] },
      ],
    };
  });
}
