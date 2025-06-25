import { type NextRequest, NextResponse } from "next/server"
import { createServer } from "http"
import fs from "fs/promises"
import path from "path"

let mockServer = null

export async function POST(request: NextRequest) {
  const { action, presetData } = await request.json()

  try {
    if (action === "start") {
      if (mockServer) {
        return NextResponse.json({
          message: "Mock服务器已在运行中",
          success: true,
        })
      }

      const mockFile = presetData?.mockFile || "sse-mock-data.json"
      // 读取SSE数据
      // 安全性检查：确保 mockFile 是一个有效且安全的文件名，防止路径遍历攻击。
      if (!mockFile || typeof mockFile !== 'string' || mockFile.includes('..') || mockFile.includes('/') || mockFile.includes('\\')) {
        return NextResponse.json({
          message: `请求的文件名无效或包含非法路径字符: "${mockFile}"`,
          success: false,
        }, { status: 400 })
      }
      const mockDataPath = path.join(process.cwd(), 'preset-data', mockFile)
      let sseData = []

      try {
        const data = await fs.readFile(mockDataPath, "utf-8")
        sseData = JSON.parse(data)
      } catch (error) {
        console.log("未找到mock数据文件，使用空数据", error)
      }

      // 创建Mock服务器
      mockServer = createServer((req, res) => {
        // 设置CORS头
        res.setHeader("Access-Control-Allow-Origin", "*")
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", "*")
        console.log("收到请求", req.method)

        if (req.method === "OPTIONS") {
          res.writeHead(200)
          res.end()
          return
        }

        // 根据URL路径匹配对应的SSE数据
        const matchedRequest = sseData;

        if (matchedRequest) {
          // 返回SSE响应
          console.log("开始响应数据", matchedRequest.length, "条事件数据")
          res.writeHead(200, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          })

          // 发送事件数据
          if (matchedRequest.length) {
            let eventIndex = 0
            let baseTime = matchedRequest[0].timestamp;
            const sendEvent = () => {
              if (eventIndex < matchedRequest.length) {
                const event = matchedRequest[eventIndex]

                res.write(event.value)
                console.log(`发送事件: ${eventIndex + 1}/${matchedRequest.length}`, event.value)

                eventIndex++
                setTimeout(sendEvent, event.timestamp - baseTime)
                baseTime = event.timestamp; // 更新基准时间
              } else {
                res.end() // 结束连接
                console.log("所有事件已发送")
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
