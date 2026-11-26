# language: fr
@to-validate
Fonctionnalité: Dessin des relations
  En tant que lecteur d'un diagramme
  Je veux suivre chaque flèche et lire ce qu'elle transporte
  Afin de comprendre les échanges entre éléments

  Contexte:
    Étant donné le modèle "examples/online-banking.json"

  Scénario: Chaque relation est un groupe SVG observable avec une pointe vers la destination
    Quand je génère le SVG de la vue "containers"
    Alors le SVG contient 6 groupes de type "relationship"
    Et la relation de "web" vers "api" se termine par une pointe de flèche sur le bord de "api"

  Scénario: Une relation sans id est identifiée par sa source et sa destination
    Quand je génère le SVG de la vue "containers"
    Alors le SVG contient un groupe "data-c4-id" "web->api" de type "relationship"
    # Proposition : "from->to" quand la relation n'a pas d'id ; l'id déclaré sinon.
    # Non unique si deux relations sans id relient les mêmes éléments dans le même sens : suffixe "#2" ? À décider.

  Scénario: Le libellé contient la description puis la technologie entre crochets
    Quand je génère le SVG de la vue "containers"
    Alors la relation de "customer" vers "web" affiche dans l'ordre les lignes :
      | ligne          |
      | Views accounts |
      | [HTTPS]        |

  Scénario: Le libellé ne chevauche aucune boîte
    Quand je génère le SVG de la vue "components"
    Alors aucun libellé de relation ne chevauche un élément ou une frontière

  Scénario: Le trait part et arrive sur le bord des boîtes, pas en leur centre
    Quand je génère le SVG de la vue "context"
    Alors chaque relation commence sur le contour de sa source et finit sur le contour de sa destination

  Scénario: Style de relation par tag
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{ "id": "a", "name": "A" }, { "id": "b", "name": "B" }],
          "relationships": [{ "from": "a", "to": "b", "tags": ["Async"] }]
        },
        "views": [{ "type": "systemLandscape", "key": "v" }],
        "styles": {
          "relationships": [{ "tag": "Async", "color": "#cc0000", "style": "dotted", "thickness": 3 }]
        }
      }
      """
    Quand je génère le SVG de la vue "v"
    Alors la relation de "a" vers "b" est tracée en "#cc0000", trait "dotted", épaisseur 3
    Et sa pointe de flèche est en "#cc0000"

  Scénario: Par défaut les relations sont en trait plein gris-bleu, à angles droits
    Quand je génère le SVG de la vue "context"
    Alors la relation de "banking" vers "mainframe" est tracée en "#4f5d75", trait "solid", épaisseur 1.2
    Et son tracé n'est fait que de segments horizontaux et verticaux

  Scénario: Deux relations entre les mêmes éléments ne se superposent pas
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "softwareSystems": [{ "id": "a", "name": "A" }, { "id": "b", "name": "B" }],
          "relationships": [
            { "from": "a", "to": "b", "description": "Sends orders" },
            { "from": "b", "to": "a", "description": "Sends invoices" }
          ]
        },
        "views": [{ "type": "systemLandscape", "key": "v" }]
      }
      """
    Quand je génère le SVG de la vue "v"
    Alors les tracés des deux relations sont distincts
    Et leurs libellés ne se chevauchent pas
