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
      pair: 'sd',
      lines: [
        'Coucou Pola, Marguerite & Pierre ! Entre les vers de Baudelaire et le Bateau ivre de Rimbaud, on dirait les planches les plus poétiques d’un grand manga !',
        'Et ces quais parisiens au crépuscule ont tout d’un décor de roman policier : on s’attend presque à croiser le commissaire Maigret !',
        'Bonne chasse aux quatre premiers badges… et gardez le cap sur la gloire littéraire !',
      ],
    },
    2: {
      pair: 'jp',
      lines: [
        'Colette m’a tellement parlé de pêches et de chocolat chaud sur le Quartier des Romanciers que j’en ai déjà l’eau à la bouche !',
        'Et moi, avec cette lumière dorée sur les façades, j’ai failli sortir mon Leica pour cadrer Victor Hugo !',
        'Cap sur les 8 badges le trio, vous écrivez déjà votre propre chef-d’œuvre !',
      ],
    },
    3: {
      pair: 'aj',
      lines: [
        'Franchement, l’escrime de Cyrano sur le Boulevard des Théâtres, ça fuse aussi vite qu’un crochet de Mbappé !',
        'Gare aux répliques de Sarah Bernhardt… elle vous cloue sur place aussi net qu’un contre de Wembanyama !',
        'Plus que quelques badges avant d’aller affronter Molière sur son trône !',
      ],
    },
  },
  df: {
    1: {
      pair: 'sd',
      lines: [
        'Soleil sur Copacabana, Dominique & Francis ! L’énergie de Chaplin et Keaton a le même rythme fou qu’un grand anime de Studio Trigger !',
        'Et entre les accords de Chiquinha Gonzaga et les ombres du cinéma muet, on retrouve toute la magie des grands classiques du 7e art !',
        'Ramenez-nous les quatre premiers badges en dansant la samba !',
      ],
    },
    2: {
      pair: 'jp',
      lines: [
        'Moi je rêve déjà d’une vraie feijoada mijotée après les répliques cultes d’Humphrey Bogart sur Studio Boulevard !',
        'Et quelle lumière ici : j’ai déjà mitraillé toutes les étoiles du trottoir au 50 mm !',
        'En route vers les 8 badges ! Silence, moteur… et surtout, action !',
      ],
    },
    3: {
      pair: 'aj',
      lines: [
        'Méfiez-vous d’Hitchcock là-haut : son suspense est plus tendu qu’une séance de tirs au but à la 120e !',
        'Et la Bossa Nova de Tom Jobim est tellement fluide qu’on dirait un tir à 3 points de Curry en plein filet !',
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
        'Sur le passe d’Alain Ducasse, ça court aussi vite qu’une contre-attaque en finale de Coupe du monde !',
        'Et l’Instant Décisif de Cartier-Bresson, c’est exactement comme déclencher un buzzer beater au dixième de seconde !',
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
      pair: 'sd',
      lines: [
        'On se croirait dans un grand shōnen sportif sur cette avenue… les dunks de LeBron et les appuis de Messi, quel spectacle !',
        'Gardez votre sang-froid de détective face à Zizou là-haut : un vrai suspense digne d’un polar français !',
        'Allez chercher la coupe finale, Alexis & Joseph ! On vous encourage depuis Néo-Noir & Manga !',
      ],
    },
  },
  sd: {
    1: {
      pair: 'pm',
      lines: [
        'Coucou Sam & Denis ! Entre les bulles de manga et les enquêtes de Maigret, ce quartier a un charme fou !',
        'Méfiez-vous des tours de passe-passe d’Arsène Lupin : il est encore plus rusé que les valets de Molière !',
        'Bonne chasse aux quatre premiers badges, les enquêteurs du soir !',
      ],
    },
    2: {
      pair: 'df',
      lines: [
        'Quelles lumières néon et sépia sur ces avenues ! Entre Arcane, Ghost in the Shell et le suspense de Clouzot, on adore !',
        'Et Agatha Christie verrouille ses intrigues encore plus serré qu’un thriller d’Hitchcock !',
        'Cap sur les 8 badges, Sam & Denis : l’enquête avance à grands pas !',
      ],
    },
    3: {
      pair: 'jp',
      lines: [
        'Après les nuits cyberpunk d’Akira et de Monster, je vous prépare un bon ramen fumant pour fêter ça !',
        'Et moi, la photographie noir et blanc de Melville et la Nouvelle Vague de Truffaut… j’ai envie de tout cadrer au 35 mm !',
        'Plus qu’un dernier effort avant d’aller défier Hayao Miyazaki au sommet !',
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
      customPortraitUrl: memA.customPortraitUrl,
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
