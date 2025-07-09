#!/bin/bash

# Script de génération des diagrammes PlantUML
# Architecture Hybride - LOG430 Lab TB

echo "🎨 Génération des diagrammes PlantUML pour l'Architecture Hybride"
echo "=================================================================="

# Vérifier si PlantUML est disponible
if ! command -v plantuml &> /dev/null; then
    echo "❌ PlantUML n'est pas installé. Installation..."
    
    # Installer Java si nécessaire
    if ! command -v java &> /dev/null; then
        echo "📦 Installation de Java..."
        sudo apt update
        sudo apt install -y default-jdk
    fi
    
    # Télécharger PlantUML
    echo "📥 Téléchargement de PlantUML..."
    wget -O plantuml.jar http://sourceforge.net/projects/plantuml/files/plantuml.jar/download
    sudo mv plantuml.jar /usr/local/bin/
    
    # Créer un script wrapper
    echo '#!/bin/bash' | sudo tee /usr/local/bin/plantuml
    echo 'java -jar /usr/local/bin/plantuml.jar "$@"' | sudo tee -a /usr/local/bin/plantuml
    sudo chmod +x /usr/local/bin/plantuml
    
    echo "✅ PlantUML installé avec succès"
fi

# Créer le dossier de sortie pour les images
OUTPUT_DIR="docs/images"
mkdir -p "$OUTPUT_DIR"

# Liste des diagrammes à générer
DIAGRAMS=(
    "docs/Architecture_Hybride_Complete.puml"
    "docs/Architecture_Complete_Flow_Console.puml"
    "docs/Architecture_Globale_Ports_Complet.puml"
    "docs/Responsabilites_Microservices_Par_Console.puml"
    "docs/Sequence_Flow_Consoles_Detaille.puml"
    "docs/Flux_Routage_Par_Console_Detaille.puml"
    "docs/Matrice_Responsabilites_Microservices.puml"
    "docs/Vue_Ensemble_Ports_Flux.puml"
    "docs/Exemples_Utilisation_Consoles.puml"
)

echo ""
echo "📊 Génération des diagrammes..."
echo "================================"

# Générer chaque diagramme
for diagram in "${DIAGRAMS[@]}"; do
    if [ -f "$diagram" ]; then
        echo "🔄 Génération: $(basename "$diagram")"
        
        # Générer PNG et SVG
        plantuml -tpng -o "../$OUTPUT_DIR" "$diagram"
        plantuml -tsvg -o "../$OUTPUT_DIR" "$diagram"
        
        if [ $? -eq 0 ]; then
            echo "✅ $(basename "$diagram") généré avec succès"
        else
            echo "❌ Erreur lors de la génération de $(basename "$diagram")"
        fi
    else
        echo "⚠️  Fichier non trouvé: $diagram"
    fi
done

echo ""
echo "📁 Images générées dans: $OUTPUT_DIR"
echo "======================================"

# Lister les fichiers générés
if [ -d "$OUTPUT_DIR" ]; then
    echo "📸 Fichiers PNG générés:"
    ls -la "$OUTPUT_DIR"/*.png 2>/dev/null | awk '{print "   " $9}' || echo "   Aucun fichier PNG trouvé"
    
    echo ""
    echo "🎯 Fichiers SVG générés:"
    ls -la "$OUTPUT_DIR"/*.svg 2>/dev/null | awk '{print "   " $9}' || echo "   Aucun fichier SVG trouvé"
fi

echo ""
echo "🎉 Génération terminée !"
echo "========================"

# Créer un index HTML pour visualiser tous les diagrammes
INDEX_FILE="$OUTPUT_DIR/index.html"
echo "📝 Création de l'index HTML: $INDEX_FILE"

cat > "$INDEX_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Architecture Hybride - Diagrammes</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        .diagram {
            margin: 20px 0;
            text-align: center;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
        }
        .diagram img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
        }
        .description {
            margin-top: 10px;
            font-style: italic;
            color: #666;
        }
        .nav {
            background-color: #3498db;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .nav a {
            color: white;
            text-decoration: none;
            margin: 0 10px;
            padding: 5px 10px;
            border-radius: 3px;
            background-color: rgba(255,255,255,0.2);
        }
        .nav a:hover {
            background-color: rgba(255,255,255,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏗️ Architecture Hybride - Diagrammes Techniques</h1>
        
        <div class="nav">
            <a href="#vue-ensemble">Vue d'Ensemble</a>
            <a href="#architecture">Architecture</a>
            <a href="#flux">Flux & Routage</a>
            <a href="#responsabilites">Responsabilités</a>
            <a href="#exemples">Exemples</a>
        </div>

        <h2 id="vue-ensemble">🌐 Vue d'Ensemble</h2>
        
        <div class="diagram">
            <h3>Architecture Hybride Complète</h3>
            <img src="Architecture_Hybride_Complete.png" alt="Architecture Hybride Complète">
            <div class="description">
                Vue globale de l'architecture hybride montrant la coexistence du système legacy 
                avec les 4 microservices essentiels et le routage intelligent.
            </div>
        </div>

        <div class="diagram">
            <h3>Vue d'Ensemble - Ports et Flux</h3>
            <img src="Vue_Ensemble_Ports_Flux.png" alt="Vue d'Ensemble Ports et Flux">
            <div class="description">
                Détail technique des ports, connexions et flux de données entre tous les composants.
            </div>
        </div>

        <h2 id="architecture">🏛️ Architecture Détaillée</h2>

        <div class="diagram">
            <h3>Architecture Complète - Flow par Console</h3>
            <img src="Architecture_Complete_Flow_Console.png" alt="Architecture Flow Console">
            <div class="description">
                Structure détaillée montrant comment chaque console interagit avec les différents services.
            </div>
        </div>

        <div class="diagram">
            <h3>Architecture Globale - Ports Complets</h3>
            <img src="Architecture_Globale_Ports_Complet.png" alt="Architecture Ports Complets">
            <div class="description">
                Vue technique complète avec tous les ports et connexions réseau.
            </div>
        </div>

        <h2 id="flux">🔄 Flux et Routage</h2>

        <div class="diagram">
            <h3>Flux de Routage Détaillé par Console</h3>
            <img src="Flux_Routage_Par_Console_Detaille.png" alt="Flux Routage Console">
            <div class="description">
                Séquences détaillées montrant comment les requêtes sont routées selon le type de console.
            </div>
        </div>

        <div class="diagram">
            <h3>Séquences Flow Consoles Détaillé</h3>
            <img src="Sequence_Flow_Consoles_Detaille.png" alt="Sequence Flow Consoles">
            <div class="description">
                Diagrammes de séquence pour chaque type d'interaction console-système.
            </div>
        </div>

        <h2 id="responsabilites">📋 Responsabilités</h2>

        <div class="diagram">
            <h3>Matrice des Responsabilités Microservices</h3>
            <img src="Matrice_Responsabilites_Microservices.png" alt="Matrice Responsabilités">
            <div class="description">
                Matrice claire montrant ce que gère chaque microservice selon le type de console.
            </div>
        </div>

        <div class="diagram">
            <h3>Responsabilités Microservices par Console</h3>
            <img src="Responsabilites_Microservices_Par_Console.png" alt="Responsabilités par Console">
            <div class="description">
                Vue détaillée des responsabilités de chaque service selon la console utilisée.
            </div>
        </div>

        <h2 id="exemples">💡 Exemples d'Utilisation</h2>

        <div class="diagram">
            <h3>Exemples d'Utilisation - Scénarios Concrets</h3>
            <img src="Exemples_Utilisation_Consoles.png" alt="Exemples Utilisation">
            <div class="description">
                Scénarios concrets d'utilisation pour chaque type de console avec exemples de requêtes.
            </div>
        </div>

        <hr style="margin: 40px 0;">
        
        <p style="text-align: center; color: #666;">
            <strong>Architecture Hybride LOG430 Lab TB</strong><br>
            Générée automatiquement le $(date)<br>
            <em>Système Legacy + 4 Microservices Essentiels</em>
        </p>
    </div>
</body>
</html>
EOF

echo "✅ Index HTML créé: $INDEX_FILE"
echo ""
echo "🌐 Pour visualiser les diagrammes:"
echo "   firefox $INDEX_FILE"
echo "   ou ouvrez le fichier dans votre navigateur"
echo ""
echo "📚 Documentation complète disponible dans:"
echo "   - README_ARCHITECTURE_HYBRIDE.md"
echo "   - SYNTHESE_ARCHITECTURE_COMPLETE.md"
