# language: fr
@to-validate
Fonctionnalité: Dessin des éléments
  En tant que lecteur d'un diagramme
  Je veux reconnaître d'un coup d'œil le type et le rôle de chaque boîte
  Afin de lire le diagramme sans consulter le modèle

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: Chaque élément affiché est un groupe SVG observable
    Quand je génère le SVG de la vue "containers"
    Alors le SVG contient un groupe "data-c4-id" "web" de type "container"
    Et le SVG contient un groupe "data-c4-id" "customer" de type "person"
    Et le SVG contient un groupe "data-c4-id" "mainframe" de type "softwareSystem"

  Scénario: Le libellé suit la convention C4 : nom, type et technologie, description
    Quand je génère le SVG de la vue "containers"
    Alors l'élément "web" affiche dans l'ordre les lignes :
      | ligne                 |
      | Web application       |
      | [Container: React]    |
      | Customer interface    |
    Et le nom de l'élément "web" est en gras

  Scénario: Un système logiciel n'a pas de technologie dans son libellé
    Quand je génère le SVG de la vue "context"
    Alors l'élément "banking" affiche la ligne "[Software System]"

  # Les couleurs sont décrites dans colors.feature, vérifiées par approbation du dessin.

  Scénario: Une personne est dessinée avec la forme "person"
    Quand je génère le SVG de la vue "landscape"
    Alors l'élément "advisor" a la forme "person"
    Et l'élément "customer" a la forme "person"

  Scénario: Un style par tag change la forme
    Quand je génère le SVG de la vue "containers"
    Alors l'élément "database" a la forme "cylinder"
    Et l'élément "web" a la forme "roundedBox"
    # Proposition : "roundedBox" (rayon 6) par défaut, là où Structurizr utilise "box".

  Scénario: Les styles de plusieurs tags se cumulent dans l'ordre des tags de l'élément
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{ "id": "a", "name": "A", "tags": ["Legacy", "Critical"] }]
        },
        "views": [{ "type": "systemLandscape", "key": "v" }],
        "styles": {
          "elements": [
            { "tag": "Critical", "stroke": "#cc0000" },
            { "tag": "Legacy", "background": "#777777", "stroke": "#000000", "border": "dashed" }
          ]
        }
      }
      """
    Quand je génère le SVG de la vue "v"
    Alors l'élément "a" a le fond "#777777"
    Et l'élément "a" a la bordure "#cc0000" en trait "dashed"
    # Proposition : les tags sont appliqués dans l'ordre de l'élément, le dernier l'emporte propriété par propriété
    # (comportement supposé de Structurizr, à vérifier).

  Scénario: Une icône en data URI est affichée dans l'élément
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": { "softwareSystems": [{ "id": "a", "name": "A", "tags": ["Cloud"] }] },
        "views": [{ "type": "systemLandscape", "key": "v" }],
        "styles": {
          "elements": [{ "tag": "Cloud", "icon": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=" }]
        }
      }
      """
    Quand je génère le SVG de la vue "v"
    Alors l'élément "a" contient une image dont le href est cette data URI
    # L'icône SVG est référencée par <image>, jamais copiée en ligne : ses scripts éventuels ne s'exécutent pas.

  Scénario: Un texte trop long passe à la ligne sans déborder de la boîte
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{
            "id": "a",
            "name": "A",
            "description": "A very long description that cannot possibly fit on a single line of a default sized box"
          }]
        },
        "views": [{ "type": "systemLandscape", "key": "v" }]
      }
      """
    Quand je génère le SVG de la vue "v"
    Alors la description de l'élément "a" occupe plusieurs lignes
    Et toutes les lignes de l'élément "a" tiennent dans sa largeur

  Scénario: Les options "metadata" et "description" masquent des lignes
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": { "softwareSystems": [{ "id": "a", "name": "A", "description": "D", "tags": ["Terse"] }] },
        "views": [{ "type": "systemLandscape", "key": "v" }],
        "styles": { "elements": [{ "tag": "Terse", "metadata": false, "description": false }] }
      }
      """
    Quand je génère le SVG de la vue "v"
    Alors l'élément "a" affiche uniquement la ligne "A"
