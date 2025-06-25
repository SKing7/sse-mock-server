import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SSERequestDetail({ sseRequests }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>捕获的SSE请求</CardTitle>
        <CardDescription>
          显示所有监听到的Server-Sent Events请求
        </CardDescription>
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
              <div className="text-xs text-muted-foreground mb-2">
                事件数量: {request.events?.length || 0}
              </div>
              {request.events?.slice(0, 3).map((event, eventIndex) => (
                <div
                  key={eventIndex}
                  className="bg-muted p-2 rounded text-xs font-mono mb-1"
                >
                  {event.data}
                </div>
              ))}
              {request.events?.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  ... 还有 {request.events.length - 3} 个事件
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
