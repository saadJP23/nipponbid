# Self-Hosted Runner Setup (your Mac)

The `deploy` job runs on `runs-on: self-hosted` — this means GitHub sends the
deploy job to a runner process running on your machine, which has direct access
to minikube.

## One-time setup

### 1. Register the runner on GitHub

Go to your repo on GitHub:
**Settings → Actions → Runners → New self-hosted runner**

Select: **macOS / x64**

GitHub gives you a token and a set of commands. Run them in Terminal:

```bash
# Create a folder for the runner
mkdir ~/actions-runner && cd ~/actions-runner

# Download (GitHub shows the exact URL with your token)
curl -o actions-runner-osx-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.xx.x/actions-runner-osx-x64-2.xx.x.tar.gz
tar xzf ./actions-runner-osx-x64.tar.gz

# Configure (GitHub generates this command with your repo URL + token)
./config.sh --url https://github.com/saadJP23/Nipponbid --token <YOUR_TOKEN>
```

### 2. Install as a background service (auto-start on login)

```bash
cd ~/actions-runner
./svc.sh install
./svc.sh start
```

Verify it's running:
```bash
./svc.sh status
```

The runner now appears as **Online** in GitHub Settings → Runners.

---

### 3. Add GitHub Secrets (for sensitive env vars)

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Add these three (the rest are hardcoded in values.yaml for learning — in production rotate them):

| Secret name | Value |
|-------------|-------|
| `DB_PASSWORD` | `UAhrFgyKVimhFeEgmlYEAbRQFDlvGVST` |
| `JWT_SECRET` | `nipponbid_super_secret_jwt_key_2024_production` |
| `CLOUDINARY_API_SECRET` | `nfzBrVlQrqh2ysUzqB7kI-p962A` |

`GITHUB_TOKEN` is auto-provided by GitHub Actions — no setup needed.

---

### 4. Make sure minikube is running before pushes

```bash
minikube start
minikube addons enable ingress
minikube addons enable metrics-server
```

The runner needs `kubectl`, `helm`, `docker`, and `minikube` in its PATH.
Confirm with:
```bash
which kubectl helm docker minikube
```

---

## Full pipeline flow

```
git push → main
     │
     ▼
┌─────────────────────────────────────────────────┐
│ Job 1: build-and-push  (GitHub's ubuntu server) │
│  • npm ci + npm run build                       │
│  • docker build frontend → ghcr.io/…:abc1234   │
│  • docker build backend  → ghcr.io/…:abc1234   │
└──────────────────────┬──────────────────────────┘
                       │ on success
                       ▼
┌─────────────────────────────────────────────────┐
│ Job 2: deploy  (self-hosted runner on your Mac) │
│  • eval $(minikube docker-env)                  │
│  • docker pull ghcr.io/…:abc1234               │
│  • helm upgrade --install nipponbid ./helm \    │
│      --set frontend.image=…:abc1234 \           │
│      --set backend.image=…:abc1234              │
│  • kubectl rollout status …                     │
│  • helm rollback on failure                     │
└─────────────────────────────────────────────────┘
```

## Trigger a manual deploy

```bash
# From GitHub UI: Actions tab → Deploy → Run workflow
# Or via CLI:
gh workflow run deploy.yml
```
