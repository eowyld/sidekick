/**
 * Ouvre /reset-data dans le navigateur pour effacer toutes les données Sidekick.
 * L'app doit tourner (npm run dev). Cross-platform (macOS, Windows, Linux).
 */
const { exec } = require("child_process");
const url = "http://localhost:3000/reset-data";
const cmd =
  process.platform === "darwin"
    ? `open "${url}"`
    : process.platform === "win32"
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
exec(cmd, (err) => {
  if (err) {
    console.error("Ouvre http://localhost:3000/reset-data dans ton navigateur.");
    process.exit(1);
  }
});
