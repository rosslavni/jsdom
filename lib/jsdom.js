
var dom = exports.dom = require("./jsdom/level3/index").dom,
    fs  = require("fs"),
    pkg = JSON.parse(fs.readFileSync(__dirname + "/../package.json"));
exports.defaultLevel = dom.level3.html;
exports.browserAugmentation = require("./jsdom/browser/index").browserAugmentation;
exports.windowAugmentation = require("./jsdom/browser/index").windowAugmentation;

exports.debugMode = false;

var createWindow = exports.createWindow = require("./jsdom/browser/index").createWindow;

exports.__defineGetter__('version', function() {
  return pkg.version;
});

exports.jsdom = function (html, level, options) {

  options = options || {};
  level   = level || exports.defaultLevel;

  if (!options.url) {
    options.url = module.parent.id == 'jsdom'   ?
                  module.parent.parent.filename :
                  module.parent.filename;
  }

  if (options.features && options.features.QuerySelector) {
    require("./jsdom/selectors/index").applyQuerySelectorPrototype(level);
  }

  var browser = exports.browserAugmentation(level, options),
      doc     = (browser.HTMLDocument)             ?
                 new browser.HTMLDocument(options) :
                 new browser.Document(options);

  exports.applyDocumentFeatures(doc, options.features);
  
  if (!!html) {
    doc.write(html + '')
  } else {
    doc.write('<html><head></head><body></body></html>');
  }

  if (doc.close && !options.deferClose) {
    doc.close();
  }

  // Kept for backwards-compatibility. The window is lazily created when
  // document.parentWindow or document.defaultView is accessed.
  doc.createWindow = function() {
    // Remove ourself
    if (doc.createWindow) {
      delete doc.createWindow;
    }
    return doc.parentWindow;
  };

  return doc;
};

exports.html = function(html, level, options) {
  html += '';
  // body
  if (!~html.indexOf('<body')) {
    html = '<body>' + html + '</body>';
  }

  // html
  if (!~html.indexOf('<html')) {
    html = '<html>' + html + '</html>';
  }
  return exports.jsdom(html, level, options);
};

exports.availableDocumentFeatures = [
  'FetchExternalResources',
  'ProcessExternalResources',
  'MutationEvents',
  'QuerySelector'
];

exports.defaultDocumentFeatures = {
  "FetchExternalResources"   : ['script'/*, 'img', 'css', 'frame', 'link'*/],
  "ProcessExternalResources" : ['script'/*, 'frame', 'iframe'*/],
  "MutationEvents"           : '2.0',
  "QuerySelector"            : false
};

exports.applyDocumentFeatures = function(doc, features) {
  var i, maxFeatures = exports.availableDocumentFeatures.length,
      defaultFeatures = exports.defaultDocumentFeatures,
      j,
      k,
      featureName,
      featureSource;

  features = features || {};

  for (i=0; i<maxFeatures; i++) {
    featureName = exports.availableDocumentFeatures[i];
    if (typeof features[featureName] !== 'undefined') {
      featureSource = features[featureName];
    } else if (defaultFeatures[featureName]) {
      featureSource = defaultFeatures[featureName];
    } else {
      continue;
    }

    doc.implementation.removeFeature(featureName);

    if (typeof featureSource !== 'undefined') {
      if (featureSource instanceof Array) {
        k = featureSource.length;
        for (j=0; j<k; j++) {
          doc.implementation.addFeature(featureName, featureSource[j]);
        }
      } else {
        doc.implementation.addFeature(featureName, featureSource);
      }
    }
  }
};

exports.jQueryify = exports.jsdom.jQueryify = function (window /* path [optional], callback */) {

  if (!window || !window.document) { return; }

  var args = Array.prototype.slice.call(arguments),
      callback = (typeof(args[args.length - 1]) === 'function') && args.pop(),
      path,
      jQueryTag = window.document.createElement("script");

  if (args.length > 1 && typeof(args[1] === 'string')) {
    path = args[1];
  }

  var features = window.document.implementation._features;

  window.document.implementation.addFeature('FetchExternalResources', ['script']);
  window.document.implementation.addFeature('ProcessExternalResources', ['script']);
  window.document.implementation.addFeature('MutationEvents', ["1.0"]);
  jQueryTag.src = path || 'http://code.jquery.com/jquery-latest.js';
  window.document.body.appendChild(jQueryTag);

  jQueryTag.onload = function() {
    if (callback) {
      callback(window, window.jQuery);
    }

    window.document.implementation._features = features;
  };

  return window;
};


exports.env = exports.jsdom.env = function(config, callback) {
  var self = this;
  config.html += '';

  if(!config || !callback) {
    throw new Error('JSDOM: a config and callback must be supplied.');
  }

  fs.readFile(config.html, function(err, html) {

    if(err) {
      throw new Error('JSDOM: the document for the new environment could not be loaded.');
    }

    var window = self.html(html.toString()).createWindow(),
        features = window.document.implementation._features,
        docsLoaded = 0, readyState = null;

    if (!window || !window.document) {
      throw new Error('JSDOM: a window object could not be created.'); 
    }

    window.document.implementation.addFeature('FetchExternalResources', ['script']);
    window.document.implementation.addFeature('ProcessExternalResources', ['script']);
    window.document.implementation.addFeature('MutationEvents', ['1.0']);

    config.scripts.forEach(function(src) {
      var script = window.document.createElement('script');
      script.onload = function() { docsLoaded++; };
      script.src = src;
      window.document.head.appendChild(script);
    });

    docsLoader = setInterval(function() {
      if(docsLoaded == config.scripts.length) {
        clearInterval(docsLoader);
          callback(window);
      }
    }, 1);
  });
};
