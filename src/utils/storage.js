let Storage = {
  set: function(name, val) {
    localStorage.setItem(name, val);
  },
  get: function(name) {
    return localStorage.getItem(name);
  },
};

export default Storage;
