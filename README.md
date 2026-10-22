# Hunt the Wumpus

Hunt the Wumpus made with Angular. You move around a square grid, avoid pits, shoot the Wumpus, pick up the gold and leave through the exit. Before each game you choose the board size, how many pits there are and how many arrows you carry. The interface works in English and Spanish.

## What you need

- Node.js 24.21.0, which includes npm. That is the version this was built and tested with.
- A current browser. Chrome, Firefox, Edge or Safari will do.

You do not need a database, an API key or any other service. The whole game runs in the browser.

## Run it locally

1. Clone the repository and enter the folder:

   ```bash
   git clone https://github.com/CloudNine13/niji-test-project.git
   cd niji-test-project
   ```

2. Install the dependencies. You only need to do this once, and it requires an internet connection:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm start
   ```

4. Open <http://localhost:4200> in your browser. The page reloads by itself when you change the source code.

5. Press `Ctrl+C` in the terminal to stop the server.

If port 4200 is already in use, start the app on another port:

```bash
npm start -- --port 4300
```

Then open <http://localhost:4300>.

## How to play

The first screen asks for three things: board size, number of pits and number of arrows. Use the dropdowns, then press Start game.

On the game screen the grid shows where you are, which way you face and where the exit is. The buttons under the board let you advance, turn left, turn right, shoot an arrow or exit. The text box underneath records every move and tells you what you notice nearby. A stench means the Wumpus is next to you. A breeze means there is a pit next to you.

Walk onto the gold to pick it up. Once you have it, walk to the exit and press Exit to win. If you step into a pit or onto the Wumpus, the game ends and you can start a new one with the same settings.

## Run the tests

The project has unit tests. They run in Chrome, so Chrome has to be installed:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```
