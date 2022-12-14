/* eslint no-process-env:0 no-console:0 */
"use strict";

const path = require("path");

module.exports = config => {
  const options = {
    basePath: path.resolve(__dirname, ".."),
    frameworks: ["mocha-webworker", "browserify"],

    files: [
      {
        pattern: "lib/**",
        watched: true,
        served: false,
        included: false
      },
      {
        // this directory is served so that we can test fetching fixtures
        // make sure that this pattern does not match the entry point test/index.js
        // otherwise we hit node-browserify#1003
        pattern: "test/!(web-platform-tests)/**",
        served: true,
        watched: true,
        included: false
      },
      {
        pattern: "test/index.js",
        watched: false,
        served: true,
        included: false
      }
    ],

    preprocessors: {
      "test/index.js": ["browserify"]
    },

    browserify: {
      debug: true,
      configure(bundle) {
        bundle.ignore("fs");
        // TODO: support WPTs in browsers.
        bundle.ignore("./test/web-platform-tests/run-wpts.js");
        bundle.ignore("./test/web-platform-tests/run-tuwpts.js");
      }
    },

    client: {
      mochaWebWorker: {
        // The "karma-browserify" plugin injects a script which contains the generated bundle, with an url
        // that looks like:
        //   /absoluteC:/Users/JORIS_~1/AppData/Local/Temp/6b4966e7ca75e6aaf594c1d334b1ce0f.browserify.js
        // The plugin then replaces our script (test/index.js) with a single `require()` call.
        //
        // Currently, chrome can not display a stack for errors that occur during importScripts():
        // https://code.google.com/p/chromium/issues/detail?id=580862
        // To avoid this issue, that `require()` call is not made during `importScripts()`, and `eval("require(...)")`
        // is used instead.
        //
        // We do this by making sure the "karma-mocha-webworker" plugin only calls `importScripts()` for
        // the bundle itself, using the `client.mochaWebWorker.pattern setting`. The `require()` call generated by
        // "karma-browserify" is now no longer used. Instead we use the `client.mochaWebWorker.evaluate.beforeRun`
        // setting, which "karma-mocha-webworker" passes to eval() just before starting the mocha run.

        pattern: ["*browserify.js"],
        evaluate: {
          beforeRun:
            "require(" +
            // This is the same path as the one that "karma-browserify" generates:
            JSON.stringify(path.resolve(__dirname, "index.js")) +
            ")"
        }
      }
    },

    reporters: ["progress"],
    port: 9877,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,

    browsers: ["ChromeHeadless"],
    singleRun: true,


    // Allow SharedArrayBuffer: see https://web.dev/cross-origin-isolation-guide/
    customHeaders: [
      {
        match: ".*",
        name: "Cross-Origin-Opener-Policy",
        value: "same-origin"
      },
      {
        match: ".*",
        name: "Cross-Origin-Embedder-Policy",
        value: "require-corp"
      }
    ]
  };

  config.set(options);
};
