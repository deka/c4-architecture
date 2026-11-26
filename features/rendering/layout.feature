# language: fr
@to-validate
Fonctionnalité: Disposition, frontières, groupes et légende
  En tant que lecteur d'un diagramme
  Je veux un diagramme aéré, sans chevauchement, qui suit la direction demandée
  Afin de le lire sans effort

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: Aucun élément n'en chevauche un autre
    Quand je génère le SVG de chacune des vues
    Alors dans chaque vue aucun élément ne chevauche un autre élément

  Scénario: La direction TB place les sources au-dessus des destinations
    Quand je génère le SVG de la vue "components"
    Alors "controller" est au-dessus de "service"
    Et "service" est au-dessus de "repository"

  Scénario: La direction LR place les sources à gauche des destinations
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{ "id": "a", "name": "A" }, { "id": "b", "name": "B" }],
          "relationships": [{ "from": "a", "to": "b" }]
        },
        "views": [{ "type": "systemLandscape", "key": "v", "layout": { "direction": "LR" } }]
      }
      """
    Quand je génère le SVG de la vue "v"
    Alors "a" est à gauche de "b"

  Scénario: La frontière du scope entoure ses enfants et eux seuls
    Quand je génère le SVG de la vue "containers"
    Alors le SVG contient un groupe "data-c4-id" "banking" de type "boundary"
    Et la frontière "banking" contient entièrement "web", "api" et "database"
    Et la frontière "banking" ne touche pas "customer", "mainframe" ni "email"
    Et la frontière "banking" affiche "Online banking" et "[Software System]"
    Et la frontière "banking" est tracée en pointillés, sans fond plein

  Scénario: Les éléments d'un même groupe sont entourés d'un cadre nommé
    Étant donné la vue suivante remplace les vues existantes :
      """json
      { "type": "systemLandscape", "key": "v" }
      """
    Quand je génère le SVG de la vue "v"
    Alors le SVG contient un cadre de groupe "Branch" qui contient entièrement "advisor" et "mainframe"
    Et le cadre de groupe "Branch" ne touche pas "customer"
    # Pas encore couvert par computeView : la vue ne porte que la frontière du scope, pas les groupes.

  Scénario: La légende liste les styles réellement utilisés dans la vue
    Quand je génère le SVG de la vue "containers"
    Alors le SVG contient un groupe de type "legend"
    Et la légende contient les entrées "Person", "Container", "Software System", "Database", "Relationship"
    Et la légende ne contient pas l'entrée "Component"

  Scénario: Le SVG s'adapte à la largeur de la page sans être déformé
    Quand je génère le SVG de la vue "containers"
    Alors le SVG a un attribut "viewBox" qui englobe tous les éléments avec une marge
    Et le SVG conserve ses proportions
