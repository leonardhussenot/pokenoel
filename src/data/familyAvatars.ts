import alexisPortraitUrl from '../assets/portraits/alexis.jpg';
import denisPortraitUrl from '../assets/portraits/denis.jpg';
import dominiquePortraitUrl from '../assets/portraits/dominique.jpg';
import francisPortraitUrl from '../assets/portraits/francis.jpg';
import josephPortraitUrl from '../assets/portraits/joseph.jpg';
import juliettePortraitUrl from '../assets/portraits/juliette.jpg';
import leoPortraitUrl from '../assets/portraits/leo.jpg';
import margueritePortraitUrl from '../assets/portraits/marguerite.jpg';
import pierrePortraitUrl from '../assets/portraits/pierre.jpg';
import pierre2PortraitUrl from '../assets/portraits/pierre2.jpg';
import polaPortraitUrl from '../assets/portraits/pola.jpg';
import samPortraitUrl from '../assets/portraits/sam.jpg';
import { FamilyMember, FamilyMemberId, FamilyPair, ModeId } from '../types';

/**
 * Avatars de la famille (11 membres).
 *
 * COMMENT PERSONNALISER À PARTIR DE PHOTOS :
 * 1) Ajustez directement `appearance` (couleurs, coiffure, lunettes, barbe, chapeau, tenue)
 *    et `portrait` ci-dessous, OU
 * 2) Renseignez `customPortraitUrl` (image JPG/PNG ou Data URL) et/ou
 *    `customSpriteSheetUrl` (planche 4x3 de vignettes 16x24) sur n'importe quel membre :
 *    le moteur de rendu utilisera automatiquement vos visuels sans modifier la logique du jeu !
 */
export const FAMILY_MEMBERS: Record<FamilyMemberId, FamilyMember> = {
  pola: {
    id: 'pola',
    name: 'Pola',
    voicePitch: 620,
    appearance: {
      skin: '#f8d6c0',
      hairColor: '#543b2c',
      hairStyle: 'bangs_wavy',
      headwear: 'none',
      glasses: 'clear',
      glassesColor: '#dce3ee',
      facialHair: 'none',
      topColor: '#202229',
      bottomColor: '#ece6da',
      accentColor: '#f6d776',
      outfitStyle: 'casual',
    },
    portrait: {
      bgTop: '#4e254f',
      bgBottom: '#291532',
      eyeColor: '#3b2419',
      collar: 'normal',
      prop: 'quill',
      blush: true,
      smile: 'normal',
    },
    customPortraitUrl: polaPortraitUrl,
  },
  marguerite: {
    id: 'marguerite',
    name: 'Marguerite',
    voicePitch: 680,
    appearance: {
      skin: '#f4cdb4',
      hairColor: '#2d2626',
      hairStyle: 'tousled_curls',
      headwear: 'none',
      glasses: 'round',
      glassesColor: '#23242e',
      facialHair: 'none',
      topColor: '#3f5b78',
      bottomColor: '#1f263b',
      accentColor: '#9fb3c9',
      outfitStyle: 'casual',
    },
    portrait: {
      bgTop: '#244e53',
      bgBottom: '#162932',
      eyeColor: '#2c221e',
      collar: 'normal',
      prop: 'mask',
      blush: true,
      smile: 'wide',
    },
    customPortraitUrl: margueritePortraitUrl,
  },
  pierre_pm: {
    id: 'pierre_pm',
    name: 'Pierre',
    voicePitch: 295,
    appearance: {
      skin: '#efc4a4',
      hairColor: '#c9c1b2',
      hairStyle: 'tousled_curls',
      headwear: 'none',
      glasses: 'none',
      facialHair: 'stubble',
      facialHairColor: '#bfb8ab',
      topColor: '#dba53a',
      bottomColor: '#2d3340',
      accentColor: '#4e5c3e',
      outfitStyle: 'casual',
    },
    portrait: {
      bgTop: '#4e2445',
      bgBottom: '#1a383a',
      eyeColor: '#566b73',
      collar: 'normal',
      prop: 'quill',
      smile: 'normal',
    },
    customPortraitUrl: pierre2PortraitUrl,
  },
  dominique: {
    id: 'dominique',
    name: 'Dominique',
    voicePitch: 560,
    appearance: {
      skin: '#efbd9b',
      hairColor: '#d9dde6',
      hairStyle: 'tousled_curls',
      headwear: 'none',
      glasses: 'sunglasses',
      glassesColor: '#291c18',
      facialHair: 'none',
      topColor: '#1f222a',
      bottomColor: '#567ea8',
      accentColor: '#e0894a',
      outfitStyle: 'coat',
    },
    portrait: {
      bgTop: '#6b321d',
      bgBottom: '#2d1828',
      eyeColor: '#4a2b1c',
      collar: 'scarf',
      prop: 'guitar',
      blush: true,
      smile: 'wide',
    },
    customPortraitUrl: dominiquePortraitUrl,
  },
  francis: {
    id: 'francis',
    name: 'Francis',
    voicePitch: 310,
    appearance: {
      skin: '#e6b28c',
      hairColor: '#d8dce6',
      hairStyle: 'receding',
      headwear: 'none',
      glasses: 'none',
      facialHair: 'stubble',
      facialHairColor: '#b7bcc7',
      topColor: '#1e2842',
      bottomColor: '#cbb28f',
      accentColor: '#f2f5fa',
      outfitStyle: 'coat',
    },
    portrait: {
      bgTop: '#213454',
      bgBottom: '#141928',
      eyeColor: '#2b4059',
      collar: 'hoodie',
      prop: 'film',
      smile: 'normal',
    },
    customPortraitUrl: francisPortraitUrl,
  },
  juliette: {
    id: 'juliette',
    name: 'Juliette',
    voicePitch: 640,
    appearance: {
      skin: '#f0c19e',
      hairColor: '#a65c32',
      hairStyle: 'short',
      headwear: 'none',
      glasses: 'sunglasses',
      glassesColor: '#1f2128',
      facialHair: 'none',
      topColor: '#9e8949',
      bottomColor: '#283042',
      accentColor: '#d94d4d',
      outfitStyle: 'casual',
    },
    portrait: {
      bgTop: '#5c242e',
      bgBottom: '#291722',
      eyeColor: '#3c251c',
      collar: 'normal',
      prop: 'whisk',
      blush: true,
      smile: 'wide',
    },
    customPortraitUrl: juliettePortraitUrl,
  },
  pierre: {
    id: 'pierre',
    name: 'Pierre',
    voicePitch: 340,
    appearance: {
      skin: '#e8b592',
      hairColor: '#4c4744',
      hairStyle: 'receding',
      headwear: 'none',
      glasses: 'sunglasses',
      glassesColor: '#5c361e',
      facialHair: 'beard',
      facialHairColor: '#c9c1b2',
      topColor: '#1d2238',
      bottomColor: '#232630',
      accentColor: '#d6a44b',
      outfitStyle: 'casual',
    },
    portrait: {
      bgTop: '#243a4d',
      bgBottom: '#131d28',
      eyeColor: '#384e3d',
      collar: 'normal',
      prop: 'camera',
      smile: 'normal',
    },
    customPortraitUrl: pierrePortraitUrl,
  },
  alexis: {
    id: 'alexis',
    name: 'Alexis',
    voicePitch: 360,
    appearance: {
      skin: '#ecbe9a',
      hairColor: '#3b281e',
      hairStyle: 'sidepart',
      headwear: 'none',
      glasses: 'none',
      facialHair: 'goatee',
      facialHairColor: '#4a3528',
      topColor: '#1e52b6',
      bottomColor: '#2d6b4f',
      accentColor: '#f4f7ff',
      outfitStyle: 'jersey_foot',
      jerseyNumber: '10',
    },
    portrait: {
      bgTop: '#1c408c',
      bgBottom: '#111d42',
      eyeColor: '#2f2119',
      collar: 'normal',
      prop: 'soccer',
      smile: 'wide',
    },
    customPortraitUrl: alexisPortraitUrl,
  },
  joseph: {
    id: 'joseph',
    name: 'Joseph',
    voicePitch: 380,
    appearance: {
      skin: '#f4ccb0',
      hairColor: '#c9a359',
      hairStyle: 'spiky',
      headwear: 'none',
      glasses: 'sunglasses',
      glassesColor: '#5c316b',
      facialHair: 'goatee',
      facialHairColor: '#b8713e',
      topColor: '#efe8da',
      bottomColor: '#283145',
      accentColor: '#f0c44d',
      outfitStyle: 'casual',
    },
    portrait: {
      bgTop: '#872926',
      bgBottom: '#361419',
      eyeColor: '#3b281c',
      collar: 'necklace',
      prop: 'basketball',
      smile: 'wide',
    },
    customPortraitUrl: josephPortraitUrl,
  },
  sam: {
    id: 'sam',
    name: 'Sam',
    voicePitch: 420,
    appearance: {
      skin: '#f0c4a2',
      hairColor: '#36261d',
      hairStyle: 'tousled_curls',
      headwear: 'none',
      glasses: 'none',
      facialHair: 'stubble',
      facialHairColor: '#36261d',
      topColor: '#2a2e36',
      bottomColor: '#1b1f29',
      accentColor: '#2ec4d6',
      outfitStyle: 'coat',
    },
    portrait: {
      bgTop: '#163d4f',
      bgBottom: '#0f1c2e',
      eyeColor: '#5c6e4e',
      collar: 'hoodie',
      prop: 'none',
      smile: 'normal',
    },
    customPortraitUrl: samPortraitUrl,
  },
  denis: {
    id: 'denis',
    name: 'Denis',
    voicePitch: 300,
    appearance: {
      skin: '#d99c72',
      hairColor: '#8f7b60',
      hairStyle: 'wavy',
      headwear: 'none',
      glasses: 'none',
      facialHair: 'stubble',
      facialHairColor: '#9a948c',
      topColor: '#7e8690',
      bottomColor: '#283042',
      accentColor: '#c98a4b',
      outfitStyle: 'casual',
    },
    portrait: {
      bgTop: '#1d3247',
      bgBottom: '#111b2b',
      eyeColor: '#4c6652',
      collar: 'normal',
      prop: 'film',
      smile: 'wide',
    },
    customPortraitUrl: denisPortraitUrl,
  },
};

export const FAMILY_PAIRS: Record<ModeId, FamilyPair> = {
  pm: {
    modeId: 'pm',
    shortCode: 'PM',
    label: 'Pola, Marguerite & Pierre',
    themeLabel: 'Littérature classique & Théâtre',
    worldName: 'La Cité des Lettres',
    primaryColor: '#8d3056',
    secondaryColor: '#3b8273',
    members: [FAMILY_MEMBERS.pola, FAMILY_MEMBERS.marguerite, FAMILY_MEMBERS.pierre_pm],
  },
  df: {
    modeId: 'df',
    shortCode: 'DF',
    label: 'Dominique & Francis',
    themeLabel: 'Musique brésilienne & Cinéma américain',
    worldName: 'Rio-Hollywood',
    primaryColor: '#d97b24',
    secondaryColor: '#2f5ca8',
    members: [FAMILY_MEMBERS.dominique, FAMILY_MEMBERS.francis],
  },
  jp: {
    modeId: 'jp',
    shortCode: 'JP',
    label: 'Juliette & Pierre',
    themeLabel: 'Gastronomie & Photographie',
    worldName: 'Lumière & Saveurs',
    primaryColor: '#b53b3b',
    secondaryColor: '#3d6387',
    members: [FAMILY_MEMBERS.juliette, FAMILY_MEMBERS.pierre],
  },
  aj: {
    modeId: 'aj',
    shortCode: 'AJ',
    label: 'Alexis & Joseph',
    themeLabel: 'Football moderne & Basketball',
    worldName: 'Arena-City',
    primaryColor: '#1f5ad1',
    secondaryColor: '#d44234',
    members: [FAMILY_MEMBERS.alexis, FAMILY_MEMBERS.joseph],
  },
  sd: {
    modeId: 'sd',
    shortCode: 'SD',
    label: 'Sam & Denis',
    themeLabel: 'Manga, Animation & Polar Français',
    worldName: 'Néo-Noir & Manga',
    primaryColor: '#2ec4d6',
    secondaryColor: '#c98a4b',
    members: [FAMILY_MEMBERS.sam, FAMILY_MEMBERS.denis],
  },
};

export const MODE_ORDER: ModeId[] = ['pm', 'df', 'jp', 'aj', 'sd'];

/** Avatar de Léo, le Maître du Jeu (écran d'accueil & menu pause). */
export const GAME_MASTER_LEO = {
  name: 'Léo',
  roleLabel: 'Maître du Jeu',
  appearance: {
    skin: '#f0c4a2',
    hairColor: '#3a2b22',
    hairStyle: 'short' as const,
    headwear: 'cap' as const,
    headwearColor: '#c92a38',
    glasses: 'sunglasses' as const,
    glassesColor: '#3d281c',
    facialHair: 'stubble' as const,
    facialHairColor: '#6b4c38',
    topColor: '#234a3c',
    bottomColor: '#1b2436',
    accentColor: '#f4ce76',
    outfitStyle: 'casual' as const,
  },
  portrait: {
    bgTop: '#2a1632',
    bgBottom: '#101a30',
    eyeColor: '#3b2418',
    collar: 'normal' as const,
    prop: 'none' as const,
    smile: 'normal' as const,
  },
  customPortraitUrl: leoPortraitUrl,
};

export const LEO_WELCOME_MESSAGES: readonly string[] = [
  'Bienvenue dans le grand jeu de Noël ! Ne vous aventurez pas ici tout seul, vous aurez besoin de vos équipiers pour vous en sortir… !',
  'Bienvenue au grand jeu de Noël 2026 ! Seul, certains défis risquent de vous résister : rassemblez vite votre équipe avant d’entrer !',
  'Ho ho ho ! Bienvenue dans le grand jeu de Noël ! Chaque monde a été préparé sur mesure pour votre équipe — vous aurez besoin de tous vos cerveaux !',
  'Bienvenue dans le grand jeu de Noël ! Un conseil du Maître du Jeu : ne partez pas en solo, et si un défi vous piège, les habitants dehors gardent toujours un indice !',
  'Joyeux Noël et bienvenue ! Douze badges, un Boss Final et zéro chrono : prenez votre temps, discutez en équipe et montrez ce que vous savez faire !',
  'Bienvenue dans l’aventure de Noël 2026 ! Ne vous aventurez pas ici tout seul : vos équipiers sont votre meilleure arme pour décrocher les 12 badges !',
];

const LAST_WELCOME_KEY = 'noel2026_last_welcome_idx';

export function pickWelcomeMessage(): string {
  const count = LEO_WELCOME_MESSAGES.length;
  let lastIdx = -1;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LAST_WELCOME_KEY);
      if (raw !== null) lastIdx = Number.parseInt(raw, 10);
    }
  } catch {
    // Ignore private-mode storage errors
  }
  let idx = Math.floor(Math.random() * count);
  if (count > 1 && idx === lastIdx) {
    idx = (idx + 1 + Math.floor(Math.random() * (count - 1))) % count;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_WELCOME_KEY, String(idx));
    }
  } catch {
    // Ignore storage errors
  }
  return LEO_WELCOME_MESSAGES[idx];
}
