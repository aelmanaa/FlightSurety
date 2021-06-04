const webpack = require('webpack')
const path = require('path')
const nodeExternals = require('webpack-node-externals')
//const StartServerPlugin = require('start-server-webpack-plugin')
const StartServerPlugin = require('start-server-nestjs-webpack-plugin')

module.exports = {
    entry: [
        'webpack/hot/poll?1000',
        './src/server/index'
    ],
    watch: true,
    target: 'node',
    externals: [nodeExternals({
        allowlist: ['webpack/hot/poll?1000']
    })],
    module: {
        rules: [{
            test: /\.js?$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ["@babel/preset-env"],
                    plugins: ["@babel/plugin-transform-runtime"]
                }
            },
            exclude: /node_modules/
        }]
    },
    plugins: [
        new StartServerPlugin('server.js'),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        new webpack.DefinePlugin({
            "process.env": {
                "BUILD_TARGET": JSON.stringify('server')
            }
        }),
    ],
    output: {
        path: path.join(__dirname, 'prod/server'),
        filename: 'server.js'
    }
}