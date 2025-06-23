"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Play, Square, Server, Download } from "lucide-react"

export default function Component() {
  const [url, setUrl] = useState("https://web-dev.wenxiaobai.com/")
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [isMockServerRunning, setIsMockServerRunning] = useState(false)
  const [sseRequests, setSseRequests] = useState([])
  const [logs, setLogs] = useState("")

  const startMonitoring = async () => {
    setIsMonitoring(true)
    setLogs("开始监听SSE请求...\n")

    try {
      const response = await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, action: "start" }),
      })

      const data = await response.json()
      setLogs((prev) => prev + `监听已启动: ${data.message}\n`)
    } catch (error) {
      setLogs((prev) => prev + `错误: ${error.message}\n`)
      setIsMonitoring(false)
    }
  }

  const stopMonitoring = async () => {
    try {
      const response = await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      })

      const data = await response.json()
      setSseRequests(data.sseRequests || [])
      setLogs((prev) => prev + `监听已停止，捕获到 ${data.sseRequests?.length || 0} 个SSE请求\n`)
    } catch (error) {
      setLogs((prev) => prev + `错误: ${error.message}\n`)
    }

    setIsMonitoring(false)
  }

  const startMockServer = async () => {
    try {
      const response = await fetch("/api/mock-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      })

      const data = await response.json()
      setIsMockServerRunning(true)
      setLogs((prev) => prev + `Mock服务器已启动: ${data.message}\n`)
    } catch (error) {
      setLogs((prev) => prev + `错误: ${error.message}\n`)
    }
  }

  const stopMockServer = async () => {
    try {
      const response = await fetch("/api/mock-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      })

      setIsMockServerRunning(false)
      setLogs((prev) => prev + "Mock服务器已停止\n")
    } catch (error) {
      setLogs((prev) => prev + `错误: ${error.message}\n`)
    }
  }

  const downloadMockData = () => {
    const dataStr = JSON.stringify(sseRequests, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "sse-mock-data.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SSE 监听器 & Mock 服务器</h1>
        <p className="text-muted-foreground">监听网页中的Server-Sent Events请求，保存数据并创建Mock服务器</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 监听控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              SSE 监听器
            </CardTitle>
            <CardDescription>启动Chrome实例监听指定页面的SSE请求</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">目标URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isMonitoring}
              />
            </div>

            <div className="flex gap-2">
              {!isMonitoring ? (
                <Button onClick={startMonitoring} className="flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  开始监听
                </Button>
              ) : (
                <Button onClick={stopMonitoring} variant="destructive" className="flex-1">
                  <Square className="w-4 h-4 mr-2" />
                  停止监听
                </Button>
              )}
            </div>

            {isMonitoring && (
              <Badge variant="secondary" className="w-full justify-center">
                正在监听中...
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Mock服务器控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Mock 服务器
            </CardTitle>
            <CardDescription>使用捕获的数据启动SSE Mock服务器</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              捕获到的SSE请求: <Badge variant="outline">{sseRequests.length}</Badge>
            </div>

            <div className="flex gap-2">
              {!isMockServerRunning ? (
                <Button onClick={startMockServer} className="flex-1" disabled={sseRequests.length === 0}>
                  <Server className="w-4 h-4 mr-2" />
                  启动Mock服务器
                </Button>
              ) : (
                <Button onClick={stopMockServer} variant="destructive" className="flex-1">
                  <Square className="w-4 h-4 mr-2" />
                  停止Mock服务器
                </Button>
              )}

              <Button onClick={downloadMockData} variant="outline" disabled={sseRequests.length === 0}>
                <Download className="w-4 h-4" />
              </Button>
            </div>

            {isMockServerRunning && (
              <Badge variant="secondary" className="w-full justify-center">
                Mock服务器运行中 - http://localhost:3001
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SSE请求列表 */}
      {sseRequests.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>捕获的SSE请求</CardTitle>
            <CardDescription>显示所有监听到的Server-Sent Events请求</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sseRequests.map((request, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{request.method}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(request.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm font-mono mb-2">{request.url}</div>
                  <div className="text-xs text-muted-foreground mb-2">事件数量: {request.events?.length || 0}</div>
                  {request.events?.slice(0, 3).map((event, eventIndex) => (
                    <div key={eventIndex} className="bg-muted p-2 rounded text-xs font-mono mb-1">
                      {event.data}
                    </div>
                  ))}
                  {request.events?.length > 3 && (
                    <div className="text-xs text-muted-foreground">... 还有 {request.events.length - 3} 个事件</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-6" />

      {/* 日志面板 */}
      <Card>
        <CardHeader>
          <CardTitle>运行日志</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={logs}
            readOnly
            className="min-h-[200px] font-mono text-sm"
            placeholder="日志将在这里显示..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
