/**
 * 00_Config.gs
 * Constantes de configuration du classeur Group Sync.
 */
const CONFIG = Object.freeze({
  DOMAINE: 'sgdf-lyon-saone-et-collines.fr',

  EMAIL_PROPRIETAIRE_GROUPES:
    'administrateur@sgdf-lyon-saone-et-collines.fr',

  EMAIL_NOTIFICATION_SYNC_AUTO:
    'administrateur@sgdf-lyon-saone-et-collines.fr',

  ONGLET_MEMBRES: 'Adhérents',
  ONGLET_MAPPING: 'Mapping',
  ONGLET_CONFIG: 'Config',
  ONGLET_INFOS: 'Infos configuration',
  ONGLET_ANCIEN_INFOS: 'Infos',
  ONGLET_JOURNAL: 'Journal',

  CREER_GROUPES_SI_ABSENT: true,

  ADRESSE_GROUPE_ADHERENTS:
    'adherent@sgdf-lyon-saone-et-collines.fr',

  PREFIXE_OBJET_DIFFUSION:
    '[🏕️ Territoire - Lyon Saône et Collines]',

  SAISON_PAR_DEFAUT: '2026-2027',

  // ---------- Nom des groupes Google ----------
  // Nom d'un groupe de mission = PREFIXE_NOM_GROUPE + FORMAT_NOM_GROUPE_PAR_DEFAUT
  // Exemple : "Groupe Diffusion - Compagnons - SVCR"
  PREFIXE_NOM_GROUPE: 'Groupe Diffusion - ',
  FORMAT_NOM_GROUPE_PAR_DEFAUT: '{Mission} - {Nom du groupe}',
  NOM_GROUPE_PAR_DEFAUT: '',
  NOM_GROUPE_COMMUN: 'Adhérents',
  LONGUEUR_MAX_NOM_GROUPE: 73,

  // ---------- Réglages Google Groups ----------
  // true  : les réglages sont réappliqués à chaque synchronisation
  //         (écrase les modifications manuelles faites dans l'Admin Console).
  // false : ils ne sont appliqués qu'à la création du groupe.
  REAPPLIQUER_REGLAGES_A_CHAQUE_SYNCHRO: true,

  // Nouvelles tentatives pour les réglages d'un groupe tout juste créé
  // (Groups Settings peut mettre quelques secondes à le reconnaître).
  TENTATIVES_REGLAGES_APRES_CREATION: 4,

  // Visibilité des conversations. Le document de référence demande
  // ANYONE_CAN_VIEW (public). Pour restreindre aux membres :
  // 'ALL_MEMBERS_CAN_VIEW' (ou 'ALL_IN_DOMAIN_CAN_VIEW').
  VISIBILITE_CONVERSATIONS: 'ANYONE_CAN_VIEW',

  ACTIONS_RESTREINTES: [
    'Initialiser les onglets',
    'Synchroniser maintenant',
    'Réappliquer les réglages Diffusion'
  ],

  UTILISATEURS_AUTORISES: [
    'administrateur@sgdf-lyon-saone-et-collines.fr'
  ],

  SYNC_AUTO_DELAI_MINUTES: 3,

  ENTETES_MEMBRES: ['Email', 'Mission'],
  ENTETES_MAPPING: ['Mission', 'PrefixeEmail'],

  // NomGroupe est indépendant de CodeGroupe.
  // PrefixeObjet n'est PAS appliqué par l'API (réglage manuel, voir checklist).
  PARAMETRES_CONFIG: [
    'CodeGroupe',
    'NomGroupe',
    'PrefixeObjet',
    'SynchroAutomatique',
    'AdresseGroupeAdherents'
  ],

  ENTETES_JOURNAL: [
    'Date',
    'Action',
    'Résultat',
    'Détails'
  ],

  COULEUR_ENTETE: '#1F4E78',
  COULEUR_TEXTE_ENTETE: '#FFFFFF',
  COULEUR_SIMULATION: '#FCE4D6',
  COULEUR_SYNCHRO_AUTO: '#DDEBF7',
  COULEUR_ERREUR: '#C00000',
  COULEUR_FOND: '#FFFFFF',
  COULEUR_TEXTE: '#202124',

  POLICE: 'Sarabun',

  REGEX_EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
  REGEX_EMAIL_ENTETE: /mail|courriel/i,
  REGEX_MISSION_ENTETE: /mission/i,
  REGEX_EXCLUSION_STATUT: /inactif|sorti|parti/i,
  REGEX_STATUT_DIFFUSION: /^statut\s*diffusion$/i,
  REGEX_SAISON: /(?:^|\D)(\d{4})\s*[-–—]\s*(\d{4})(?:\D|$)/
});