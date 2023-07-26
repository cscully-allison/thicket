const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
    resolve: {
        // see below for an explanation
        alias: {
          svelte: path.resolve('node_modules', 'svelte/src/runtime') // Svelte 3: path.resolve('node_modules', 'svelte')
        },
        extensions: ['.mjs', '.js', '.svelte'],
        mainFields: ['svelte', 'browser', 'module', 'main'],
        conditionNames: ['svelte', 'browser', 'import']
    },
    module:{
        rules:[
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options:{
                    cwd: path.resolve(__dirname),
                    presets:["@babel/preset-env"]
                }
            },
            {
                test: /\.(html|svelte)$/,
                use: 'svelte-loader'
            },
            {
                // required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
                test: /node_modules\/svelte\/.*\.mjs$/,
                resolve: {
                    fullySpecified: false
                }
            }
            
        ]
    },
    entry: {
        // pcp: [path.resolve(__dirname,'scripts/pcp/pcp.js')],
        // topdown: [path.resolve(__dirname,'scripts/topdown/topdown.js')],
        ami: [path.resolve(__dirname,'scripts/advanced_metadata_interface/main.js')]
    },
    output: {
        // publicPath: path.resolve(__dirname, 'static/'),
        filename: '[name]_bundle.js',
        path: path.resolve(__dirname, 'static/')
        // filename: '[name]_bundle.js',
        // path: path.resolve(__dirname, 'static')
    },
    optimization: {
        minimize: false
    },
    plugins:[
        // new HtmlWebpackPlugin({
        //     template: 'templates/pcp.html',
        //     chunks: ['pcp'],
        //     filename: 'pcp_bundle.html'
        // }),
        // new HtmlWebpackPlugin({
        //     template: 'templates/topdown.html',
        //     chunks: ['topdown'],
        //     filename: 'topdown_bundle.html'
        // }),
        new HtmlWebpackPlugin({
            // template: 'templates/ami.html',
            chunks: ['ami'],
            filename: 'ami_bundle.html'
        })
    ],
    mode: 'production'
}