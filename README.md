# Webpack Nexacro loader

A Webpack plugin for loading Nexacro files.

## Installation

Install via npm:

```
npm install --save nexacro-loader
```

## Usage


#### Usage with webpack.config

To require Nexacro files, you can add the nexacro-loader to your webpack config:

``` javascript
module: {
        rules: [
            { 
                oneOf: [
                    {
                        test: /\.(png|gif|jpg)$/i,
                        type: 'asset/resource',
                        resourceQuery: /raw/,
                        use: [
                            {
                                loader: 'nexacro-loader'),
                                options: {
                                    projectRoot: path.resolve(__dirname, 'src'),
                                },
                            }
                        ],
                        generator: {
                            emit: false,
                            publicPath: 'dist/',
                        }
                    },
                    {
                        test   : /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
                        type: 'asset/resource',
                        resourceQuery: /raw/,
                        use: [
                            {
                                loader: 'nexacro-loader'),
                                options: {
                                    projectRoot: path.resolve(__dirname, 'src'),
                                },
                            }
                        ],
                        generator: {
                            emit: false,
                            publicPath: 'dist/',
                        }
                    },
                    {
                        test: /\.(xprj|xadl|xfdl|xjs|xcss|xml)$/i,
                        type: 'asset/source',
                        resourceQuery: { not: [/raw/] },
                        use: [
                            {
                                loader: 'nexacro-loader'),
                                options: {
                                    projectRoot: path.resolve(__dirname, 'src'),
                                    rules: {
                                        'project': './rules/xprj.js',
                                        'env': './rules/env.js',
                                        'typedefinition': './rules/typedefinition.js',
                                        'appvariables': './rules/appvariables.js',
                                    }
                                },
                            }
                        ],
                        enforce: 'pre',
                    }
                ]
            }
        ]
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
              exclude: /\.(xprj|xadl|xfdl|xjs|xcss|xml).js/i,
            }),
          ],
    }
```

