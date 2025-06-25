import { type NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import fs from "fs";

let browser = null;
let page = null;
let sseRequests = [];

export async function POST(request: NextRequest) {
  const { url, action } = await request.json();

  try {
    if (action === "start") {
      // 启动浏览器
      browser = await chromium.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const context = await browser.newContext();
      page = await context.newPage();

      // 清空之前的请求记录
      sseRequests = [];

      // 注入脚本来捕获SSE数据
      await page.addInitScript(() => {
        // 存储捕获的SSE数据
        window.sseCapture = {
          requests: [],
          eventSources: new Map(),
        };

        // 1. 拦截 EventSource
        const OriginalEventSource = window.EventSource;
        window.EventSource = (url, eventSourceInitDict) => {
          console.log("EventSource created for:", url);

          const eventSource = new OriginalEventSource(url, eventSourceInitDict);
          const requestData = {
            url: url,
            method: "GET",
            headers: {},
            timestamp: new Date().toISOString(),
            events: [],
            values: [],
            type: "EventSource",
          };

          window.sseCapture.requests.push(requestData);
          window.sseCapture.eventSources.set(eventSource, requestData);

          // 拦截 addEventListener
          const originalAddEventListener = eventSource.addEventListener;
          eventSource.addEventListener = function (type, listener, options) {
            const wrappedListener = function (event) {
              const eventData = {
                type: type,
                data: event.data,
                lastEventId: event.lastEventId || null,
                timestamp: new Date().toISOString(),
              };
              requestData.events.push(eventData);
              console.log("SSE Event captured:", eventData);

              if (listener) {
                listener.call(this, event);
              }
            };
            return originalAddEventListener.call(
              this,
              type,
              wrappedListener,
              options
            );
          };

          // 拦截 onmessage
          let originalOnMessage = eventSource.onmessage;
          Object.defineProperty(eventSource, "onmessage", {
            set: function (handler) {
              originalOnMessage = handler;
              this.addEventListener("message", function (event) {
                const eventData = {
                  type: "message",
                  data: event.data,
                  lastEventId: event.lastEventId || null,
                  timestamp: new Date().toISOString(),
                };
                requestData.events.push(eventData);
                console.log("SSE Message captured:", eventData);

                if (handler) {
                  handler.call(this, event);
                }
              });
            },
            get: () => originalOnMessage,
          });

          // 拦截其他事件处理器
          const eventTypes = ["onopen", "onerror"];
          eventTypes.forEach((eventType) => {
            let originalHandler = eventSource[eventType];
            Object.defineProperty(eventSource, eventType, {
              set: function (handler) {
                originalHandler = handler;
                const eventName = eventType.substring(2); // 移除 'on' 前缀
                this.addEventListener(eventName, function (event) {
                  console.log(`SSE ${eventName} event:`, event);
                  if (handler) {
                    handler.call(this, event);
                  }
                });
              },
              get: () => originalHandler,
            });
          });

          return eventSource;
        };

        // 2. 拦截 fetch 请求（用于捕获手动处理的SSE）
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
          const response = await originalFetch.apply(this, args);

          // 检查是否是SSE响应
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("text/event-stream")) {
            console.log("SSE fetch detected:", args[0]);

            const requestData = {
              url: typeof args[0] === "string" ? args[0] : args[0].url,
              method: args[1]?.method || "GET",
              headers: Object.fromEntries(response.headers.entries()),
              timestamp: new Date().toISOString(),
              events: [],
              values: [],
              type: "fetch",
            };

            window.sseCapture.requests.push(requestData);

            // 创建一个新的Response对象来拦截流数据
            const reader = response.body.getReader();
            const stream = new ReadableStream({
              start(controller) {
                let buffer = "";

                function pump() {
                  return reader.read().then(({ done, value }) => {
                    if (done) {
                      controller.close();
                      return;
                    }

                    // 解码数据
                    const chunk = new TextDecoder().decode(value);
                    buffer += chunk;

                    // 解析SSE事件
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || ""; // 保留不完整的行

                    let currentValue = {} as any;
                    currentValue.timestamp = new Date().getTime().toString();
                    currentValue.value = chunk;
                    requestData.values.push({ ...currentValue });

                    let currentEvent = {} as any;

                    for (const line of lines) {
                      if (line.trim() === "") {
                        if (Object.keys(currentEvent).length > 0) {
                          currentEvent.timestamp = new Date().toISOString();
                          requestData.events.push({ ...currentEvent });
                          currentEvent = {};
                        }
                      } else if (line.startsWith("data:")) {
                        currentEvent.data = line.substring(5);
                        currentEvent.type = currentEvent.type;
                      } else if (line.startsWith("event:")) {
                        currentEvent.type = line.substring(6);
                      } else if (line.startsWith("id:")) {
                        currentEvent.lastEventId = line.substring(4);
                      }
                    }

                    controller.enqueue(value);
                    return pump();
                  });
                }

                return pump();
              },
            });

            return new Response(stream, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }

          return response;
        };

        // 3. 提供获取数据的方法
        window.getSSECapture = () => window.sseCapture.requests;
      });

      // 监听控制台日志来获取调试信息
      page.on("console", (msg) => {
        if (msg.text().includes("SSE")) {
          console.log("Browser console:", msg.text());
        }
      });

      // 导航到目标页面
      await page.goto(url, { waitUntil: "networkidle" });

      return NextResponse.json({
        message: `已开始监听 ${url}`,
        success: true,
      });
    }

    if (action === "stop") {
      // 从页面获取捕获的SSE数据
      try {
        const capturedData = await page.evaluate(() => {
          return window.getSSECapture ? window.getSSECapture() : [];
        });

        sseRequests = capturedData || [];
        await writeLinesAsync(
          "sse-mock-data.json",
          sseRequests.map((req) =>
            JSON.stringify(req.values, null, 2)
          )
        );
        console.log("捕获到的SSE请求数量:", sseRequests.length);
      } catch (error) {
        console.log("获取页面SSE数据时出错:", error.message);
      }

      if (browser) {
        await browser.close();
        browser = null;
        page = null;
      }

      return NextResponse.json({
        message: "监听已停止",
        success: true,
        sseRequests: sseRequests,
      });
    }
  } catch (error) {
    console.error("监听过程中出错:", error);

    // 清理资源
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }

    return NextResponse.json(
      {
        message: `错误: ${error.message}`,
        success: false,
      },
      { status: 500 }
    );
  }
}



async function writeLinesAsync(filePath: string, linesToWrite: string[]) {
  for (const line of linesToWrite) {
    try {
      await fs.promises.appendFile(filePath, line + '\n', 'utf8');
      console.log(`成功写入一行: ${line}`);
    } catch (err) {
      console.error(`写入文件失败: ${err}`);
    }
  }
  console.log('所有行已写入文件。');
}
