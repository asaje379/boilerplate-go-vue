export const home = {
  sectionTitle: 'Ce qui est deja branche',
  sectionDescription:
    'Les preferences sont stockees cote client, appliquees au document et exposees dans une UI shadcn reutilisable.',
  cards: {
    theme: {
      badge: 'Dark mode',
      title: 'Theme persistant',
      description:
        "Le choix clair, sombre ou systeme est memorise et applique des le chargement de l'application.",
    },
    i18n: {
      badge: 'i18n',
      title: 'Traductions centralisees',
      description:
        "Les contenus FR/EN passent par vue-i18n avec une locale partagee sur toute l'interface.",
    },
    ui: {
      badge: 'shadcn-vue',
      title: 'Composants prets a composer',
      description:
        'La page de demo repose sur les primitives UI existantes pour servir de base a tes prochains ecrans.',
    },
  },
  checklistTitle: 'Capacites de depart',
  checklist: {
    item1: 'Gestion du theme stockee dans localStorage avec prise en charge du mode systeme.',
    item2: "Synchronisation de la langue avec l'attribut lang du document.",
    item3: 'Navigation de base traduite pour lancer le reste du boilerplate admin.',
  },
}
