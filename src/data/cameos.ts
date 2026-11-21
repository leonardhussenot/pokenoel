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
        'Coucou Pola & Marguerite ! On s’offre un café littéraire sur les quais avant d’aller swinguer sur du choro !',
        'Méfiez-vous du Bateau ivre de Rimbaud : ça tangue plus fort qu’un gag muet de Buster Keaton !',
        'Bonne chasse aux quatre premiers badges… et ne laissez pas Baudelaire vous refiler son spleen !',
      ],
    },
    2: {
      pair: 'jp',
      lines: [
        'Regardez cette lumière dorée sur le Quartier des Romanciers… j’ai failli sortir mon Leica pour cadrer Victor Hugo !',
        'Et Colette m’a tellement parlé de pêches et de chocolat chaud que j’en ai oublié notre régime !',
        'Cap sur les 8 badges les filles, vous écrivez déjà votre propre chef-d’œuvre !',
      ],
    },
    3: {
      pair: 'aj',
      lines: [
        'Franchement, l’escrime de Cyrano sur le Boulevard des Théâtres, ça claque presque autant qu’un contre de Wembanyama !',
        'Gare aux feintes de Sarah Bernhardt… elle dégaine une réplique plus vite qu’un crochet de Mbappé !',
        'Plus que quelques badges avant d’aller affronter Molière sur son trône !',
      ],
    },
  },
  df: {
    1: {
      pair: 'pm',
      lines: [
        'Soleil sur Copacabana ! Le piano de Chiquinha Gonzaga résonne jusqu’aux quais de la Seine !',
        'Dominique & Francis, attention chez Chaplin et Keaton : ça file tellement vite qu’on dirait une scène de Feydeau !',
        'Ramenez-nous les quatre premiers badges en dansant la samba !',
      ],
    },
    2: {
      pair: 'jp',
      lines: [
        'Quelle lumière sur Studio Boulevard ! J’ai déjà mitraillé toutes les étoiles du trottoir au 50 mm !',
        'Et moi je rêve d’une vraie feijoada mijotée après les répliques cultes d’Humphrey Bogart !',
        'En route vers les 8 badges ! Silence, moteur… et surtout, action !',
      ],
    },
    3: {
      pair: 'aj',
      lines: [
        'La Bossa Nova de Tom Jobim est tellement fluide qu’on dirait un tir à 3 points de Curry en pleine lucarne !',
        'Mais méfiez-vous d’Hitchcock là-haut : son suspense est plus tendu qu’une séance de tirs au but à la 120e !',
        'Force à vous deux pour la dernière ligne droite, les stars de Rio-Hollywood !',
      ],
    },
  },
  jp: {
    1: {
      pair: 'pm',
      lines: [
        'Juliette & Pierre ! Ici, ça sent le beurre noisette, le macaron chaud et le bain révélateur à plein nez !',
        'Escoffier ne rigole pas avec le ketchup en cuisine… et Pierre Hermé surveille ses collerettes au millimètre !',
        'Bon appétit, bons clichés, et décrochez-nous ces quatre premiers badges !',
      ],
    },
    2: {
      pair: 'df',
      lines: [
        'Entre la purée 50% beurre de Robuchon et la chambre noire d’Ansel Adams, on se croirait dans un grand classique !',
        'Prenez le temps d’admirer le noir et blanc de Salgado : un vrai cinéma en une seule image.',
        'On vous attend au sommet avec vos 8 badges tout chauds sortis du four !',
      ],
    },
    3: {
      pair: 'aj',
      lines: [
        'L’Instant Décisif de Cartier-Bresson, c’est exactement comme déclencher un buzzer beater au dixième de seconde !',
        'Et sur le passe d’Alain Ducasse, ça court aussi vite qu’une contre-attaque en finale !',
        'Allez chercher vos derniers badges… Monsieur Paul Bocuse fait déjà chauffer les fourneaux !',
      ],
    },
  },
  aj: {
    1: {
      pair: 'pm',
      lines: [
        'Alexis & Joseph ! Quelle ambiance sur les terrains de quartier, ça joue presque aussi théâtralement qu’au Globe !',
        'Entre les systèmes de Tony Parker et le turbo de Mbappé, même Cyrano aurait du mal à suivre la cadence !',
        'Allez, raflez-nous ces quatre premiers trophées avec panache !',
      ],
    },
    2: {
      pair: 'df',
      lines: [
        'Les virgules de Ronaldinho, c’est de la pure samba de Rio directement sur le gazon !',
        'Et la précision chirurgicale de Stephen Curry vaut bien un travelling d’Hollywood en un seul plan-séquence !',
        'Foncez chercher les 8 badges, le public est déjà debout !',
      ],
    },
    3: {
      pair: 'jp',
      lines: [
        'On est venus shooter les dunks et les lucarnes de l’Avenue des Ballons d’Or… quel festival !',
        'Gardez le sang-froid sur les contres de LeBron et les appuis de Messi, comme devant un soufflé prêt à sortir !',
        'Plus qu’un petit effort… Zizou vous attend déjà sur le point de penalty !',
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
