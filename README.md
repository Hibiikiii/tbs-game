# TBS - Stack High, Score Higher

**"TBS (short for Tabellenbuchstappler)"** is a 3D stacking game developed for a school project, utilizing Three.js and Cannon.js. Players aim to precisely stack blocks to build the tallest tower possible. Scores are saved to a Firebase Realtime Database leaderboard.

# Features

- **3D Environment:** Built using Three.js for graphics and Cannon.js for physics simulations.
- **Real-Time Leaderboards:** Save and compare scores globally via Firebase.
- **Player Interaction:** Name input for personalized leaderboard entries.
- **Responsive Design:** Works across different screen sizes.

## How to Play

- **Start:** Input your name to begin the game.
- **Objective:** Stack blocks with precision. The accuracy of your stacking determines your score.
- **Game End:** The game ends when a block is incorrectly placed.

## Play online

[GitHub Pages](https://hibiikiii.github.io/tbs-game/)

## Installation

```bash
git clone git@github.com:Hibiikiii/tbs-game.git
cd tbs-game
# Create a .env with your Firebase web app config (see Firebase setup below)
yarn install
yarn start
```

Local server: `http://localhost:8080`

### Build

```bash
yarn build
```

Output goes to `docs/` (gitignored). CI builds this and deploys via GitHub Actions Pages.

## Firebase setup

1. Create a Firebase project and a **Realtime Database**.
2. Enable **Anonymous** authentication.
3. Add `hibiikiii.github.io` (and `localhost`) under Authentication → Settings → Authorized domains.
4. In the RTDB **Rules** tab, allow public reads on `leaderboard` and writes only when `auth.uid` matches the entry key (validate `username`, `score`, `uid`).
5. Copy the web app config into `.env` locally.
6. For GitHub Actions, add the same values as repository **Secrets** (`FIREBASE_API_KEY`, etc.).

Firebase web API keys are public by design; security comes from database rules.

## CI

Pushes to `main`/`master` run install + build, then deploy `docs/` via GitHub Pages Actions.  
In the repo: **Settings → Pages → Source: GitHub Actions**.

## Technologies Used

- **Three.js** – 3D rendering
- **Cannon.js** – physics
- **Firebase** – auth + leaderboard
- **Background Music** – [Fesliyan Studios](https://www.fesliyanstudios.com)

## License

This project is licensed under the MIT License.
