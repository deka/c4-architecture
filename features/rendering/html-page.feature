# language: fr
@to-validate
Fonctionnalité: Page HTML autonome
  En tant que lecteur
  Je veux ouvrir un seul fichier HTML dans un navigateur, sans réseau
  Afin de consulter tous les diagrammes d'un modèle n'importe où

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: Un diagramme SVG en ligne par vue déclarée, dans l'ordre de déclaration
    Quand je génère la page HTML
    Alors la page contient 4 éléments "svg" en ligne
    Et les vues apparaissent dans l'ordre "landscape", "context", "containers", "components"

  Scénario: Chaque vue a une ancre égale à sa clé
    Quand je génère la page HTML
    Alors la page contient une section d'id "containers"
    Et cette section contient le titre "Containers"

  Scénario: Le nom et la description du workspace forment l'en-tête de la page
    Quand je génère la page HTML
    Alors le titre de la page est "Online banking"
    Et l'en-tête affiche "Reference model used by the scenarios in features/."

  Scénario: La page ne charge aucune ressource externe
    Quand je génère la page HTML
    Alors la page ne contient aucune balise "script" avec un attribut "src"
    Et la page ne contient aucune balise "link"
    Et la page ne contient aucune règle CSS "@import" ni "@font-face" pointant hors d'une data URI
    Et aucun attribut "href" ou "src" de ressource ne pointe hors d'une data URI
    # Les liens cliquables issus du champ "url" des éléments sont des liens de navigation, pas des ressources.

  Scénario: Aucune ombre ni filtre, ni dans le SVG ni dans le CSS de la page
    Quand je génère la page HTML
    Alors la page ne contient aucun élément "filter"
    Et la page ne contient aucune propriété CSS "filter", "box-shadow", "text-shadow" ni "drop-shadow"

  Scénario: Le texte fourni par le modèle est échappé
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "name": "<script>alert(1)</script>",
        "model": {
          "softwareSystems": [{ "id": "a", "name": "A & B <b>", "description": "\" onload=\"x" }]
        },
        "views": [{ "type": "systemLandscape", "key": "v" }]
      }
      """
    Quand je génère la page HTML
    Alors le titre de la page est exactement "<script>alert(1)</script>"
    Et le libellé de l'élément "a" est exactement "A & B <b>"
    Et aucun élément de la page ne porte d'attribut "onload"

  Scénario: Une URL d'élément rend l'élément cliquable
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": { "softwareSystems": [{ "id": "a", "name": "A", "url": "https://example.com/a" }, { "id": "b", "name": "B" }] },
        "views": [{ "type": "systemLandscape", "key": "v" }]
      }
      """
    Quand je génère la page HTML
    Alors l'élément "a" est un lien vers "https://example.com/a"
    Et l'élément "b" n'est pas un lien
    # Le schéma n'accepte que http et https (voir features/model/elements.feature).

  Scénario: La barre latérale liste les vues par système logiciel
    Quand je génère la page HTML
    Alors la barre latérale contient, dans cet ordre, les entrées :
      | entrée         | vues                                              |
      | Overview       | landscape                                         |
      | Online banking | context, containers, components, transfer         |
    # Vue d'ensemble : paysages et vues dynamiques sans scope. Un système liste ses vues de contexte,
    # de conteneurs, de composants (sous le nom du conteneur), puis ses vues dynamiques.

  Scénario: Une seule vue est affichée, celle que désigne l'ancre
    Quand je génère la page HTML
    Alors sans ancre, seule la section "landscape" est visible
    Et avec l'ancre "#containers", seule la section "containers" est visible
    Et le système "banking" déplie ses vues dans la barre latérale
    Et le lien de la vue "containers" est mis en évidence
    # Fait en CSS (:target, :has()), sans script. À l'impression, toutes les sections sont visibles.

  Scénario: Un clic sur un élément descend dans sa vue de détail
    Quand je génère la page HTML
    Alors dans la vue "landscape", l'élément "banking" est un lien vers "#containers"
    Et dans la vue "containers", l'élément "api" est un lien vers "#components"
    Et dans la vue "containers", l'élément "web" n'est pas un lien
    # Système : sa première vue conteneurs, à défaut sa vue de contexte. Conteneur : sa première vue composants.
    # Jamais la vue courante.

  Scénario: Le lien vers la vue de détail remplace l'URL de l'élément
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [
            { "id": "a", "name": "A", "url": "https://example.com/a", "containers": [{ "id": "a1", "name": "A1" }] }
          ]
        },
        "views": [
          { "type": "systemLandscape", "key": "landscape" },
          { "type": "container", "key": "a-containers", "scope": "a" }
        ]
      }
      """
    Quand je génère la page HTML
    Alors dans la vue "landscape", l'élément "a" est un lien vers "#a-containers"
    Et ce lien s'ouvre dans le même onglet

  Scénario: On remonte d'un niveau par l'en-tête de la frontière ou le fil d'Ariane
    Quand je génère la page HTML
    Alors dans la vue "components", l'en-tête de la frontière "api" est un lien vers "#containers"
    Et le fil d'Ariane de la section "components" est "Landscape › Context › Containers › API components"
    Et la section "landscape" n'a pas de fil d'Ariane

  Scénario: Les liens de navigation sont propres à la page
    Quand je rends la vue "landscape" seule en SVG
    Alors l'élément "banking" n'est pas un lien
