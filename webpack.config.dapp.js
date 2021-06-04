const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin")
const webpack = require("webpack")

module.exports = {
  entry: ['babel-polyfill', path.join(__dirname, "src/dapp")],
  output: {
    path: path.join(__dirname, "prod/dapp"),
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.html$/,
        use: "html-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process',
      stream: 'stream-browserify',
      crypto: "crypto-browserify",
      http: "stream-http",
      https: "https-browserify",
      os: "os-browserify",
      Buffer: ['buffer', 'Buffer'],
      assert: 'assert'
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src/dapp/index.html")
    })
  ],
  resolve: {
    extensions: ['*', '.js'],
    alias: {
      process: "process",
      stream: "stream-browserify",
      crypto: "crypto-browserify",
      http: "stream-http",
      https: "https-browserify",
      os: "os-browserify",
      buffer: "buffer",
      assert: "assert"
    }
  },
  devServer: {
    contentBase: path.join(__dirname, "dapp"),
    port: 8000,
    stats: "minimal"
  }
};
