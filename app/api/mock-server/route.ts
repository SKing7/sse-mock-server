import { type NextRequest, NextResponse } from "next/server"
import { createServer } from "http"
import fs from "fs/promises"
import path from "path"

let mockServer = null

export async function POST(request: NextRequest) {
  const { action } = await request.json()

  try {
    if (action === "start") {
      if (mockServer) {
        return NextResponse.json({
          message: "Mock服务器已在运行中",
          success: true,
        })
      }

      // 读取SSE数据
      const mockDataPath = path.join(process.cwd(), "sse-mock-data.json")
      let sseData = []

      try {
        const data = await fs.readFile(mockDataPath, "utf-8")
        sseData = JSON.parse(data)
      } catch (error) {
        console.log("未找到mock数据文件，使用空数据")
      }

      // 创建Mock服务器
      mockServer = createServer((req, res) => {
        // 设置CORS头
        res.setHeader("Access-Control-Allow-Origin", "*")
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", "Content-Type")

        if (req.method === "OPTIONS") {
          res.writeHead(200)
          res.end()
          return
        }

        // 根据URL路径匹配对应的SSE数据
        const matchedRequest = sseData.find((item) => req.url && item.url.includes(req.url.split("?")[0]))

        if (matchedRequest && req.url.includes("/sse")) {
          // 返回SSE响应
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          })

          // 发送事件数据
          if (matchedRequest.events) {
            let eventIndex = 0
            const sendEvent = () => {
              if (eventIndex < matchedRequest.events.length) {
                const event = matchedRequest.events[eventIndex]

                if (event.event) {
                  res.write(`event: ${event.event}\n`)
                }
                if (event.id) {
                  res.write(`id: ${event.id}\n`)
                }
                if (event.data) {
                  res.write(`data: ${event.data}\n`)
                }
                res.write("\n")

                eventIndex++
                setTimeout(sendEvent, 1000) // 每秒发送一个事件
              }
            }
            sendEvent()
          }
        } else {
          // 返回可用的端点列表
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify(
              {
                message: "SSE Mock Server",
                endpoints: sseData.map((item) => ({
                  url: item.url,
                  method: item.method,
                  eventsCount: item.events?.length || 0,
                })),
                usage: "GET /sse - 获取SSE流数据",
              },
              null,
              2,
            ),
          )
        }
      })

      mockServer.listen(3001, () => {
        console.log("Mock服务器启动在端口 3001")
      })

      return NextResponse.json({
        message: "Mock服务器已启动在 http://localhost:3001",
        success: true,
      })
    }

    if (action === "stop") {
      if (mockServer) {
        mockServer.close()
        mockServer = null
      }

      return NextResponse.json({
        message: "Mock服务器已停止",
        success: true,
      })
    }
  } catch (error) {
    console.error("Mock服务器操作失败:", error)
    return NextResponse.json(
      {
        message: `错误: ${error.message}`,
        success: false,
      },
      { status: 500 },
    )
  }
}
