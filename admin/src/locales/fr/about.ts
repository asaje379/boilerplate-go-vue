export const about = {
  title: "Une structure simple pour faire grossir l'admin proprement.",
  description:
    'Les briques de configuration sont isolees dans des fichiers dedies pour eviter de melanger setup transverse et pages metier.',
  blocks: {
    i18n: {
      title: 'Internationalisation',
      description:
        '`src/lib/i18n.ts` centralise les messages, la locale par defaut et la liste des langues supportees.',
    },
    theme: {
      title: 'Theme',
      description:
        '`src/composables/use-theme.ts` gere la preference utilisateur, la resolution du mode systeme et la classe `dark` sur le document.',
    },
    layout: {
      title: 'Layout',
      description:
        '`src/App.vue` porte le shell principal, tandis que les vues restent focalisees sur le contenu produit.',
    },
  },
}
