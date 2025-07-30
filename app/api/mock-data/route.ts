import { type NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 提取参数解析逻辑
function extractParams(request: NextRequest, body?: any) {
  if (body) {
    // POST 请求
    const { id, presetData, conversationId, speed = 1 } = body;
    return { id, presetData, conversationId, speed };
  } else {
    // GET 请求
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const presetData = searchParams.get("presetData");
    const conversationId = searchParams.get("conversationId");
    const speed = searchParams.get("speed") || "1";
    return { id, presetData, conversationId, speed };
  }
}

// 提取文件安全性检查和读取逻辑
async function getMockData(presetData: string) {
  const mockFile = presetData || "sse-mock-data.json";
  
  // 安全性检查：确保 mockFile 是一个有效且安全的文件名
  if (
    !mockFile ||
    typeof mockFile !== "string" ||
    mockFile.includes("..") ||
    mockFile.includes("/") ||
    mockFile.includes("\\")
  ) {
    throw new Error(`请求的文件名无效或包含非法路径字符: "${mockFile}"`);
  }

  const mockDataPath = path.join(process.cwd(), "preset-data", mockFile);
  
  try {
    const data = await fs.readFile(mockDataPath, "utf-8");
    const mockData = JSON.parse(data);
    
    return mockData;
  } catch (error) {
    throw new Error("读取mock数据文件失败");
  }
}

// 提取SSE流创建逻辑
function createSSEStream(foundData: any, conversationId: string, speed: any) {
  function replaceConversationIdRegex(jsonString: string, newValue: string) {
    const regex = /"conversationId":"([^"]*)"/;
    console.log("替换conversationId:", newValue);
    return jsonString.replace(regex, `"conversationId":"${newValue}"`);
  }

  const stream = new ReadableStream({
    start(controller) {
      const sseData = foundData.events || foundData;
      
      if (!Array.isArray(sseData) || sseData.length === 0) {
        controller.enqueue(new TextEncoder().encode("data: {\"error\": \"没有可用的事件数据\"}\n\n"));
        controller.close();
        return;
      }

      console.log("开始响应数据", sseData.length, "条事件数据");
      
      let eventIndex = 0;
      let baseTime = sseData[0].timestamp;
      const speedValue = speed === "fast" ? "fast" : speed === "very fast" ? "very fast" : parseFloat(speed) || 1;

      const sendEvent = () => {
        if (eventIndex < sseData.length) {
          const event = sseData[eventIndex];
          
          let eventData = event.value;
          if (conversationId && typeof eventData === 'string') {
            eventData = replaceConversationIdRegex(eventData, conversationId);
          }

          controller.enqueue(new TextEncoder().encode(eventData));
          console.log(
            `发送事件: ${eventIndex + 1}/${sseData.length}`,
            eventData
          );

          eventIndex++;
          
          if (eventIndex < sseData.length) {
            let timeout = sseData[eventIndex].timestamp - baseTime;
            
            if (speedValue === "fast") {
              if (timeout > 1000) {
                timeout = 1000;
              }
            } else if (speedValue === "very fast") {
              if (timeout > 500) {
                timeout = 50;
              }
            } else if (typeof speedValue === 'number') {
              timeout = timeout / speedValue; // 根据速度调整发送间隔
            }
            
            console.log(speedValue, `下一个事件发送间隔: ${timeout}ms`);
            baseTime = sseData[eventIndex].timestamp; // 更新基准时间
            
            setTimeout(sendEvent, timeout);
          } else {
            controller.close();
            console.log("事件发送结束");
          }
        } else {
          controller.close();
          console.log("事件发送结束");
        }
      };

      sendEvent();
    }
  });

  return new Response(stream, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// 统一的处理逻辑
async function handleRequest(request: NextRequest, body?: any) {
  try {
    const { presetData, conversationId, speed } = extractParams(request, body);

    try {
      const foundData = await getMockData(presetData);
      return createSSEStream(foundData, conversationId, speed);
    } catch (error) {
      const status = error.message.includes("未找到id为") ? 404 : 500;
      return NextResponse.json(
        {
          message: error.message,
          success: false,
        },
        { status }
      );
    }

  } catch (error) {
    console.error("获取mock数据失败:", error);
    return NextResponse.json(
      {
        message: `错误: ${error.message}`,
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleRequest(request, body);
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}