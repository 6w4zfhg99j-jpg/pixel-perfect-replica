const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIRECTORY = 'VONA Studio Manager';
function dataPath(appData) { return path.join(appData, DATA_DIRECTORY); }
function createStore(directory) {
  const file = path.join(directory, 'studio.sqlite');
  let pending = Promise.resolve();
  return {
    file,
    async read() {
      await pending;
      try { return Array.from(await fs.readFile(file)); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
    write(bytes) {
      // Copy the caller's snapshot before queueing, and serialize atomic replaces.
      const snapshot = Buffer.from(bytes);
      const write = pending.then(async () => {
        await fs.mkdir(directory, { recursive: true });
        const temp = file + '.tmp';
        const handle = await fs.open(temp, 'w');
        try { await handle.writeFile(snapshot); await handle.sync(); }
        finally { await handle.close(); }
        await fs.rename(temp, file);
      });
      pending = write.catch(() => {});
      return write;
    },
    flush() { return pending; },
  };
}
module.exports = { DATA_DIRECTORY, dataPath, createStore };