# EcoEats

Node.js + Next.js application with PostgreSQL.

## Stack

Backend: Node.js, TypeScript, Express, Prisma  
Frontend: Next.js 16, React 19, Tailwind  
Database: PostgreSQL  
CI/CD: GitHub Actions, Docker

### .env (a la racine du projet)

DATABASE_URL="postgresql://<username>:<password>@localhost:5432/EcoEats"
STRIPE_SECRET_KEY="<your_stripe_secret_key>"
STRIPE_WEBHOOK_SECRET="<your_stripe_webhook_secret>"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="<your_stripe_publishable_key>"

- Backend: http://localhost:3001
- http://localhost:3002
- Database: localhost:5432

### Backend

```bash
cd backend
npm install          # Installer dependences
npm run build        # Compiler TypeScript
npm run start        # démarer le server sur le port :3001
npm test          # exécution unique
npm run test:watch  # mode watch

```

### Frontend

```bash
cd frontend
npm install          # Installer les dependences
npm run build        # Build Next.js
npm run start        # démarer le server sur le port :3000
npm run lint         # vérifier de la qualité du code
```

### Database

```bash
psql -U postgres              # Connectern à PostgreSQL
npx prisma migrate deploy     # Exécuter les migrations en attente
npx prisma db push           # Synchroniser le schéma avec la base de donnéese
```

## CI/CD Workflows

- `ci.yml`: Run tests + Trivy security scan on every push
- `cd.yml`: Build Docker images → push to GHCR after CI success
- `deploy.yml`: Manual SSH deployment (requires secrets)

## Lancer avec Docker (simple)

### Prerequis

- Docker Desktop installe et demarre

### Demarrage

Depuis la racine du projet:

```bash
docker compose up --build
```

### URLs

- Frontend: http://localhost:3002
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

### Arret

```bash
docker compose down
```

### Arret + suppression des donnees DB

```bash
docker compose down -v
```

## Endpoints

Base URL backend : `http://localhost:3001`

---

### Général

| Méthode | Route     | Description  |
| ------- | --------- | ------------ |
| `GET`   | `/`       | Info API     |
| `GET`   | `/health` | Health check |

---

### Auth — `/auth`

> **Règles du mot de passe** : 8–128 caractères, au moins une majuscule, une minuscule et un chiffre.
>
> **Tokens** : access token valide **15 minutes**, refresh token valide **7 jours**.

---

#### `POST /auth/register/email`

Crée un compte et retourne les tokens.

> Rate limit : **5 requêtes / heure** par IP.

**Body**

```json
{
  "name": "Alice Dupont",
  "email": "alice@example.com",
  "phone": "+33600000000",
  "password": "Password1"
}
```

**Réponse `201`**

```json
{
  "user": {
    "id": "cm...",
    "name": "Alice Dupont",
    "email": "alice@example.com",
    "phone": "+33600000000",
    "created_at": "2026-04-25T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

| Code  | Raison                                                    |
| ----- | --------------------------------------------------------- |
| `201` | Compte créé                                               |
| `400` | Validation échouée (mot de passe faible, email invalide…) |
| `409` | Email ou téléphone déjà utilisé                           |
| `429` | Rate limit dépassé                                        |
| `500` | Erreur serveur                                            |

---

#### `POST /auth/login/email`

Authentifie un utilisateur et retourne les tokens.

> Rate limit : **10 requêtes / 15 minutes** par IP.

**Body**

```json
{
  "email": "alice@example.com",
  "password": "Password1"
}
```

**Réponse `200`**

```json
{
  "user": {
    "id": "cm...",
    "name": "Alice Dupont",
    "email": "alice@example.com",
    "phone": "+33600000000",
    "created_at": "2026-04-25T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

| Code  | Raison                  |
| ----- | ----------------------- |
| `200` | Authentifié             |
| `400` | Body invalide           |
| `401` | Identifiants incorrects |
| `429` | Rate limit dépassé      |

---

#### `POST /auth/refresh`

Échange un refresh token contre une nouvelle paire de tokens (rotation).  
L'ancien refresh token est révoqué immédiatement.

**Body**

```json
{
  "refreshToken": "<jwt>"
}
```

**Réponse `200`**

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

| Code  | Raison                            |
| ----- | --------------------------------- |
| `200` | Nouveaux tokens émis              |
| `400` | Body invalide                     |
| `401` | Token expiré, révoqué ou invalide |

---

#### `POST /auth/logout`

Révoque le refresh token. Retourne toujours `204` même si le token est introuvable.

**Body**

```json
{
  "refreshToken": "<jwt>"
}
```

| Code  | Raison        |
| ----- | ------------- |
| `204` | Déconnecté    |
| `400` | Body invalide |

---

#### `GET /auth/me`

Retourne le profil de l'utilisateur authentifié.

**Header**

```
Authorization: Bearer <accessToken>
```

**Réponse `200`**

```json
{
  "id": "cm...",
  "name": "Alice Dupont",
  "email": "alice@example.com",
  "phone": "+33600000000",
  "created_at": "2026-04-25T00:00:00.000Z"
}
```

| Code  | Raison                     |
| ----- | -------------------------- |
| `200` | Profil retourné            |
| `401` | Token manquant ou invalide |

##Mise à jour
npx prisma db push # sync le schéma avec la DB
npx prisma generate # régénère le client TypeScript
npx prisma studio # interface visuelle de la DB

psql -U postgres -c "ALTER USER postgres CREATEDB;"
npx prisma db push
npx prisma generate
npm install multer
npm install --save-dev @types/multer
npm run build
cd backend

# 1. Sync DB (ajoute stripe_customer_id sur User)

npx prisma db push

# 2. Regénère le client Prisma

npx prisma generate

# 3. Recompile

npx tsup

# 4. Redémarre

npm start

## Connexion Admin

http://localhost:3000/admin/documents

## Menu Restaurant

http://localhost:3000/dashboard/restaurants/menu?restaurantId=36e48327-0f3d-4673-ae94-86d1cb904952
