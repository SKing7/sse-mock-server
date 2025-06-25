interface SSECapture {
  requests: SSERequest[];
  eventSources: Map<EventSource, SSERequest>;
}

interface Window {
  sseCapture: SSECapture;
  getSSECapture: () => any[];
  EventSource: any
  fetch: typeof fetch;
}
