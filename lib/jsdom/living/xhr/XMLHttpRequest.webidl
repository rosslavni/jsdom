// https://fetch.spec.whatwg.org/#bodyinit
// TODO: Add support for URLSearchParams and ReadableStream
typedef (Blob or BufferSource or FormData /* or URLSearchParams or ReadableStream */ or USVString) BodyInit;

// https://xhr.spec.whatwg.org/#xmlhttprequestresponsetype
enum XMLHttpRequestResponseType {
  "",
  "arraybuffer",
  "blob",
  "document",
  "json",
  "text"
};

// https://xhr.spec.whatwg.org/#xmlhttprequest
[Exposed=(Window,DedicatedWorker,SharedWorker)]
interface XMLHttpRequest : XMLHttpRequestEventTarget {
  constructor();

  // event handler
  attribute EventHandler onreadystatechange;

  // states
  const unsigned short UNSENT = 0;
  const unsigned short OPENED = 1;
  const unsigned short HEADERS_RECEIVED = 2;
  const unsigned short LOADING = 3;
  const unsigned short DONE = 4;
  readonly attribute unsigned short readyState;

  // request
  undefined open(ByteString method, USVString url);
  undefined open(ByteString method, USVString url, boolean async, optional USVString? username = null, optional USVString? password = null);
  undefined setRequestHeader(ByteString name, ByteString value);
           attribute unsigned long timeout;
           attribute boolean withCredentials;
  [SameObject] readonly attribute XMLHttpRequestUpload upload;
  undefined send(optional (Document or BodyInit)? body = null);
  undefined abort();

  // response
  readonly attribute USVString responseURL;
  readonly attribute unsigned short status;
  readonly attribute ByteString statusText;
  ByteString? getResponseHeader(ByteString name);
  ByteString getAllResponseHeaders();
  undefined overrideMimeType(DOMString mime);
           attribute XMLHttpRequestResponseType responseType;
  readonly attribute any response;
  readonly attribute USVString responseText;
  [Exposed=Window] readonly attribute Document? responseXML;
};
