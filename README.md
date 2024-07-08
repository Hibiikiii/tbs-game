# TBS - Stack High, Score Higher

**"TBS (short for Tabellenbuchstappler)"** is a 3D stacking game developed for a school project, utilizing ThreeJS and CannonJS. Players aim to precisely stack blocks to build the tallest tower possible. The game integrates Firebase for real-time leaderboard updates, though the scoring system is not yet fully implemented. Players can enter their names when they play for the first time, which will be used in the leaderboard once it's fully functional.

# Features

- **3D Environment:** Built using ThreeJS for graphics and CannonJS for physics simulations.
- **Real-Time Leaderboards:** Players will eventually save and compare scores globally via Firebase (integration in progress).
- **Player Interaction:** Initial name input for personalizing future leaderboard entries.
- **Responsive Design:** Optimized for different screen sizes, providing a seamless experience across various devices.

## How to Play

- **Start:** Input your name to begin the game.
- **Objective:** Stack blocks with precision. The accuracy of your stacking determines your score.
- **Game End:** The game ends when a block is incorrectly placed.

## Installation

To run the game locally using Parcel, clone the repository and follow these steps:
```
git clone [URL-of-your-Github-repository]
cd [Repository-Name]
yarn install
yarn start
```
This will start the local server using Parcel on `http://localhost:8080`. Open your browser and navigate to this URL to play the game.

Alternatively, if you prefer playing online, visit the hosted version on GitHub Pages:
[Github Page](https://hibiikiii.github.io/tbs-game/)

## Technologies Used

- **ThreeJS:** For 3D rendering.
- **CannonJS:** For physics simulation.
- **Firebase:** Intended for storing scores and managing leaderboards.
- **Background Music:** Courtesy of [Fesliyan Studios](https://www.fesliyanstudios.com).

## License

This project is licensed under the MIT License.

