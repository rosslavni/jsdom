// https://html.spec.whatwg.org/multipage/dom.html#domstringmap
[Exposed=Window,
 LegacyOverrideBuiltins]
interface DOMStringMap {
  [WebIDL2JSValueAsUnsupported=_undefined] getter DOMString (DOMString name);
  [CEReactions] setter undefined (DOMString name, DOMString value);
  [CEReactions] deleter undefined (DOMString name);
};
