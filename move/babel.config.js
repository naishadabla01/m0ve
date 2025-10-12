module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["module-resolver", {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".png", ".jpg"],
        alias: {
          "@": "./src",
          "@components": "./components",
          "@hooks": "./hooks",           // <-- add
          "@sb": "./supabase",
          "@constants": "./constants",
          "@assets": "./assets",
          "@root": "./"
        }
      }]
    ]
  };
};
