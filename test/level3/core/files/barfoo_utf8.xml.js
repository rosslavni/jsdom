/*<?xml version="1.0" encoding="uTf-8"?>
<!DOCTYPE html [
<!ENTITY ent1 'foo'>
<!ENTITY ent2 'foo<br/>'>
<!ELEMENT html (head, body)>
<!ATTLIST html xmlns CDATA #IMPLIED>
<!ELEMENT head (title,script*)>
<!ELEMENT title (#PCDATA)>
<!ELEMENT script (#PCDATA)>
<!ATTLIST script
     src CDATA #IMPLIED
     type CDATA #IMPLIED
     charset CDATA #IMPLIED>
<!ELEMENT body (p)>
<!ATTLIST body onload CDATA #IMPLIED>
<!ELEMENT p (#PCDATA|br)*>
<!ELEMENT br EMPTY>
<!ENTITY ent5 PUBLIC "entityURI" "entityFile" NDATA notation1>
<!NOTATION notation1 PUBLIC "notation1File">
]>
<html xmlns='http://www.w3.org/1999/xhtml'>
<head>
<title>test file</title>
</head>
<body onload="parent.loadComplete()">
<p>bar</p>
</body>
</html>*/

var core = require("../../../../lib/jsdom/level3/core").dom.level3.core;

exports.barfoo_utf8 = function() {
  var doc = new core.Document();
  var implementation = new core.DOMImplementation(doc, {"XML":  ["1.0", "2.0"], "core": ["1.0", "2.0", "3.0"]});

  var notations = new core.NotationNodeMap(doc, doc.createNotationNode("notation1","notation1File", null));

  var entities = new core.EntityNodeMap(doc,
    doc.createEntityNode('ent1', doc.createTextNode('foo')),
    doc.createEntityNode('ent2', doc.createTextNode('foo<br/>')));

  doc.normalize();
  return(doc);
};
