# 🐳 INSTALLATION DOCKER POUR WINDOWS

## 📥 Téléchargement et Installation

1. **Télécharger Docker Desktop pour Windows :**
   - URL : https://docs.docker.com/desktop/windows/install/
   - Ou lien direct : https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

2. **Prérequis système :**
   - Windows 10/11 version 1903 ou plus récente
   - WSL 2 activé (Windows Subsystem for Linux)
   - Hyper-V activé (ou containers Windows)

## ⚙️ Installation pas à pas

### Étape 1 : Télécharger l'installateur
```
Clic sur le lien : https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
```

### Étape 2 : Exécuter l'installateur
```
- Double-clic sur "Docker Desktop Installer.exe"
- Cocher "Use WSL 2 instead of Hyper-V" (recommandé)
- Suivre les instructions d'installation
```

### Étape 3 : Redémarrer l'ordinateur
```
Un redémarrage est nécessaire après l'installation
```

### Étape 4 : Vérifier l'installation
```bash
# Ouvrir un nouveau terminal PowerShell et tester :
docker --version
docker-compose --version
```

## 🔧 Configuration recommandée

### Paramètres Docker Desktop :
- **Resources > Memory :** Minimum 4GB (8GB recommandé)
- **Resources > CPU :** Minimum 2 cores
- **Enable Kubernetes :** Non nécessaire pour ce projet

## ⚡ Installation rapide alternative

Si vous voulez installer Docker rapidement via PowerShell (en tant qu'administrateur) :

```powershell
# Télécharger et installer via PowerShell (Administrateur)
Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile "$env:TEMP\DockerInstaller.exe"
Start-Process -FilePath "$env:TEMP\DockerInstaller.exe" -Wait
```

## ✅ Vérification post-installation

Après redémarrage, dans un nouveau terminal PowerShell :

```bash
# Vérifier Docker
docker --version

# Vérifier Docker Compose  
docker-compose --version

# Test rapide
docker run hello-world
```

---

**⏰ Temps d'installation estimé : 10-15 minutes + redémarrage**

**📞 Une fois Docker installé, relancez cette conversation pour continuer le déploiement Kong !**
