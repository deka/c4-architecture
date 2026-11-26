# language: fr
Fonctionnalité: Dessin d'une vue dynamique
  En tant que lecteur d'un diagramme
  Je veux lire l'ordre des interactions directement sur les liens
  Afin de suivre le scénario sans légende annexe

  Le numéro de l'étape précède sa description, sur le libellé du lien. La technologie vient de la
  relation du modèle. Une même paire d'éléments peut porter plusieurs liens numérotés.

  Scénario: Les liens portent le numéro de leur étape
    Étant donné le workspace suivant :
      """json
      {
        "version": 1,
        "model": {
          "people": [{ "id": "customer", "name": "Customer", "description": "Bank customer" }],
          "softwareSystems": [{
            "id": "banking", "name": "Online banking", "description": "Accounts and transfers",
            "containers": [
              { "id": "web", "name": "Web application", "description": "Customer interface", "technology": "React" },
              { "id": "api", "name": "API", "description": "Business logic", "technology": "Node.js" }
            ]
          }],
          "relationships": [
            { "from": "customer", "to": "web", "description": "Uses", "technology": "HTTPS" },
            { "from": "web", "to": "api", "description": "Calls", "technology": "HTTPS/JSON" }
          ]
        },
        "views": [{
          "type": "dynamic", "key": "transfer", "scope": "banking",
          "steps": [
            { "from": "customer", "to": "web", "description": "Submits a transfer" },
            { "from": "web", "to": "api", "description": "Checks the balance" },
            { "from": "web", "to": "api", "description": "Executes the transfer" }
          ]
        }]
      }
      """
    Quand je dessine la vue "transfer"
    Alors le dessin correspond à la référence "dynamic/numbered-steps", sur laquelle on voit :
      | le lien de « Customer » vers « Web application » est libellé « 1. Submits a transfer » puis « [HTTPS] » |
      | deux liens distincts vont de « Web application » vers « API », libellés « 2. … » et « 3. … »            |
      | les libellés ne se chevauchent pas                                                                      |
      | « Web application » et « API » sont dans la frontière « Online banking »                                |
