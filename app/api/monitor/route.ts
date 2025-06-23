import { type NextRequest, NextResponse } from "next/server"
import { chromium } from "playwright"

let browser = null
let page = null
let sseRequests = []

export async function POST(request: NextRequest) {
  const { url, action } = await request.json()

  try {
    if (action === "start") {
      // 启动浏览器
      browser = await chromium.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })

      const context = await browser.newContext()
      page = await context.newPage()

      // 清空之前的请求记录
      sseRequests = []

      // 监听网络请求
      page.on("response", async (response) => {
        const contentType = response.headers()["content-type"]

        // 检查是否是SSE请求
        if (contentType && contentType.includes("text/event-stream")) {
          console.log("发现SSE请求:", response.url())

          try {
            const responseBody = await response.data()
            const events = parseSSEData(responseBody)

            console.log("解析到的SSE事件:", events)
            sseRequests.push({
              url: response.url(),
              method: response.request().method(),
              headers: response.headers(),
              timestamp: new Date().toISOString(),
              events: events,
            })
          } catch (error) {
            console.error("解析SSE响应失败:", error)
          }
        }
      })

      // 导航到目标页面
      await page.goto(url, { waitUntil: "networkidle" })

      return NextResponse.json({
        message: `已开始监听 ${url}`,
        success: true,
      })
    }

    if (action === "stop") {
      if (browser) {
        await browser.close()
        browser = null
        page = null
      }

      return NextResponse.json({
        message: "监听已停止",
        success: true,
        sseRequests: sseRequests,
      })
    }
  } catch (error) {
    console.error("监听过程中出错:", error)

    // 清理资源
    if (browser) {
      await browser.close()
      browser = null
      page = null
    }

    return NextResponse.json(
      {
        message: `错误: ${error.message}`,
        success: false,
      },
      { status: 500 },
    )
  }
}

// 解析SSE数据格式
function parseSSEData(data) {
  const events = []
  const lines = data.split("\n")
  let currentEvent = {} as any;

  for (const line of lines) {
    if (line.trim() === "") {
      // 空行表示事件结束
      if (Object.keys(currentEvent).length > 0) {
        events.push({ ...currentEvent })
        currentEvent = {}
      }
    } else if (line.startsWith("data: ")) {
      currentEvent.data = line.substring(6)
    } else if (line.startsWith("event: ")) {
      currentEvent.event = line.substring(7)
    } else if (line.startsWith("id: ")) {
      currentEvent.id = line.substring(4)
    } else if (line.startsWith("retry: ")) {
      currentEvent.retry = Number.parseInt(line.substring(7))
    }
  }

  // 处理最后一个事件
  if (Object.keys(currentEvent).length > 0) {
    events.push(currentEvent)
  }

  return events
}
