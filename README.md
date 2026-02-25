# simulation-game-of-life

A static Astro site that hosts a plain JavaScript implementation of Conway's Game of Life.

## Live Demo

[https://baumanncreative.github.io/simulation-game-of-life/](https://baumanncreative.github.io/simulation-game-of-life/)

## Tech Stack

- [Astro](https://astro.build/) for layout and static site generation
- Plain JavaScript (`/public/main.js`) for the simulation logic
- Static CSS (`/public/styles.css`) for styling

## Local Development

```bash
npm install
npm run dev
```

Astro runs locally at `http://localhost:4321/simulation-game-of-life/` by default.

Optional static test (without Astro dev server):

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
