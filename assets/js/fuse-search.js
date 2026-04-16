// A simple reusable fuzzy search helper for categories
window.FuseSearch = (function () {
  let fuse;
  let data = [];

  function init(categories) {
    data = categories;
    fuse = new Fuse(categories, {
      threshold: 0.3,
      ignoreLocation: true
    });
  }

  function search(query, limit = 6) {
    if (!fuse || !query) return [];
    return fuse.search(query).slice(0, limit).map(r => r.item);
  }

  return { init, search };
})();