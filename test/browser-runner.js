#!/usr/bin/env node
// For: nodeunit
"use strict";

require('colors');
var browserify = require('browserify');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
const ecstatic = require('ecstatic');
var nodeunit = require('nodeunit');
var optimist = require('./runner-options');
var Q = require('q');
var querystring = require('querystring');
var runnerDisplay = require('./browser-display');
var portfinder = require('portfinder').getPortPromise;
var installSelenium = Q.denodeify(require('selenium-standalone').install);
var startSeleniumCb = require('selenium-standalone').start;
var wd = require('wd');
const { createServer } = require('./util.js');

var browser;

optimist.
  usage('Run the jsdom test suite in a browser via WebDriver').
  describe('web-driver-port', 'port to run Selenium on').
  describe('verbose-web-driver', 'print verbose output from wd to stdout').
  describe('verbose-browser-console', 'print browser console to stdout');

var argv = optimist.argv;

if (argv.help) {
  optimist.showHelp();
  process.exit();
}

var wdPort = argv['web-driver-port'];

/**
 * Return the body of a function as a string
 *
 * wd should do this for us, but it doesn't
 */
function getFnBody(fn) {
  var src = fn.toString();
  return src.slice(src.indexOf('{') + 1, src.lastIndexOf('}'));
}

function run() {
  var passed = false;
  console.log('running tests');

  return browser.init({
      browserName: 'chrome',
      version: '56',
      name: 'Travis tmpvar/jsdom #' + process.env['TRAVIS_JOB_NUMBER'],
      'tunnel-identifier': process.env['TRAVIS_JOB_NUMBER'],
      build: process.env['TRAVIS_BUILD_NUMBER'],
      tags: ['tmpvar/jsdom', 'CI']
    })
    .then(function () {
      console.log('browser initialized');
      return browser.setAsyncScriptTimeout(5000);
    })
    .then(function () {
      return browser.get(`http://localhost:${server.address().port}/index.html?${querystring.stringify(argv)}`);
    })
    .then(function (result) {
      console.log('navigated');
      function browserPoll() {
        var events = window._browserRunner.events;

        return events.splice(0, events.length);
      }

      var deferred = Q.defer();

      var runner = new EventEmitter();
      runnerDisplay(runner, argv, function (err) {
        passed = !err;
        deferred.resolve();
      });
      var nodeunitTypes = nodeunit.types;

      function poll() {
        browser.
          execute(getFnBody(browserPoll)).
          then(function (events) {
            var done = false;

            events.forEach(function (event) {
              switch (event.event) {
                case 'testDone':
                case 'moduleDone':
                  runner.emit(event.event,
                    event.detail[0],
                    nodeunitTypes.assertionList(
                      event.detail[1].map(nodeunitTypes.assertion)));
                  break;
                case 'log':
                  runner.emit(event.event,
                    nodeunitTypes.assertion(event.detail[0]));
                  break;
                case 'done':
                  runner.emit(event.event,
                    nodeunitTypes.assertionList(
                      event.detail[0].map(nodeunitTypes.assertion)));
                  break;
                case 'console':
                case 'http':
                case 'status':
                case 'command':
                  browser.
                    emit.apply(browser, [event.event].concat(event.detail));
                  break;
                default:
                  runner.emit.apply(runner, [event.event].concat(event.detail));
              }

              if (event.detail && event.event === 'done') {
                done = true;
              }
            });

            if (!done) {
              setTimeout(poll, 50);
            }
          });
      }

      poll();
      return deferred.promise;
    })
    .finally(function () {
      return browser.quit();
    })
    .then(function() {
      return passed;
    });
}

function startSelenium(options) {
  return Q.nfcall(startSeleniumCb, options);
}

let server;

// browserify and run the tests
browserify('./test/worker.js').
  bundle().
  pipe(fs.createWriteStream('./test/worker-bundle.js')).
  on('finish', function () {
    Q.fcall(function () {
      console.log('starting http server');
      return createServer(ecstatic({ root: __dirname }));
    })
    .then(function (s) {
      server = s;
      console.log('http server started on port ' + server.address().port);

      return wdPort || portfinder();
    })
    .then(function (port) {
      wdPort = port;

      var opts = {
        port: wdPort
      };

      if (process.env['TEST_SUITE'] === 'browser') {
        wdPort = 4445;

        opts = {
          port: wdPort,
          user: process.env['SAUCE_USERNAME'],
          pwd: process.env['SAUCE_ACCESS_KEY']
        };
      }

      // set up webdriver
      browser = wd.promiseRemote(opts);

      if (argv['verbose-web-driver']) {
        // really verbose wd logging
        browser.on('status', function (info) {
          console.log(info.cyan);
        });
        browser.on('command', function (eventType, command, response) {
          console.log(' > ' + eventType.cyan, command, (response || '').grey);
        });
        browser.on('http', function (method, path, data) {
          console.log(' > ' + method.magenta, path, (data || '').grey);
        });
      }

      if (argv['verbose-browser-console']) {
        browser.on('console', function (detail) {
          console[detail.level].apply(console, detail.message);
        });
      }

      if (process.env['TEST_SUITE'] !== 'browser') {
        console.log('installing selenium');

        return installSelenium()
          .then(() => {
            console.log('starting selenium server on port', wdPort);

            return startSelenium({
              spawnOptions: { stdio: 'pipe' },
              seleniumArgs: ['-port', wdPort]
            });
          })
          .then(child => {
            console.log('selenium server started; running tests');

            return run()
              .finally(() => {
                console.log('stopping selenium server');
                child.kill();
              });
          });
      } else {
        return run();
      }
    })
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(err => {
      console.error('Failed to run browser tests', err);
      process.exit(1);
    })
    .done();
  });
