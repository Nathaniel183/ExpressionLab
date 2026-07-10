(() => {
  const parseJsonLines = (text, sourceName = "unknown") => {
    const items = [];
    text.split(/\r?\n/).forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) return;
      try {
        items.push(JSON.parse(line));
      } catch (error) {
        throw new Error(`${sourceName} 第 ${index + 1} 行不是有效 JSON：${error.message}`);
      }
    });
    return items;
  };

  const fetchText = async (path) => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`无法读取 ${path}（${response.status}）`);
    return response.text();
  };

  const loadManifest = async () => {
    const text = await fetchText("data/manifest.txt");
    return JSON.parse(text);
  };

  const loadGroup = async (files = []) => {
    const chunks = await Promise.all(files.map(async (file) => {
      const text = await fetchText(`data/${file}`);
      return parseJsonLines(text, file);
    }));
    return chunks.flat();
  };

  const loadAllData = async () => {
    const manifest = await loadManifest();
    const [coverage, examples, exercises, materials, prompts] = await Promise.all([
      loadGroup(manifest.coverage),
      loadGroup(manifest.examples),
      loadGroup(manifest.exercises),
      loadGroup(manifest.materials),
      loadGroup(manifest.prompts)
    ]);
    return { manifest, coverage, examples, exercises, materials, prompts };
  };

  window.ExpressionDataLoader = { parseJsonLines, loadAllData };
})();
